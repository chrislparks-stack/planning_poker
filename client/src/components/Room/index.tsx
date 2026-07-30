import { useRef, useEffect, useState, useMemo, RefObject } from "react";

import {
  RoomReactionFragmentFragment,
  useRoomChatSubscription,
  useRoomReactionsSubscription,
  useSetRoomOwnerMutation
} from "@/api";
import { Player } from "@/components/Player";
import { Table } from "@/components/Table";
import { ChatBubble } from "@/components/ui/chat-bubble";
import type { Room } from "@/types";
import { getPickedUserCard } from "@/utils";
import { decompressMessage } from "@/utils/messageUtils.ts";
import { DEV_TEST_USER_COUNT, withTestUsers } from "@/utils/testUtils.tsx";

interface RoomProps {
  room?: Room;
  onShowInChat?: () => void;
  roomRef?: RefObject<HTMLDivElement | null>;
  chatVisible?: boolean;
}

export interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export function Room({ room, onShowInChat, roomRef, chatVisible }: RoomProps) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const playerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [senderName, setSenderName] = useState<string | null>(null);
  const [lastChats, setLastChats] = useState<Record<string, string | null>>({});
  const [activeReactions, setActiveReactions] = useState<
    Record<string, RoomReactionFragmentFragment>
  >({});
  const reactionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const getPlayerAnchorRect = (playerId: string) => {
    const el = playerRefs.current[playerId];
    if (!el) return null;
    return el.getBoundingClientRect();
  };
  const [setRoomOwner] = useSetRoomOwnerMutation({ errorPolicy: "none" });

  const users = useMemo(
    () => withTestUsers(DEV_TEST_USER_COUNT, room?.users),
    [room?.users]
  );

  // Keep the seating geometry and rendered cards in step with the table as it
  // scales down. Full-size rooms remain unchanged.
  const layoutScale = tableRect
    ? Math.max(0.8, Math.min(1, tableRect.width / 400))
    : 1;
  const CARD_WIDTH = 60 * layoutScale;
  const CARD_HEIGHT = 96 * layoutScale;
  const CARD_MARGIN = 20 * layoutScale;
  const TB_ROW_OFFSET = CARD_HEIGHT + 14 * layoutScale;
  const SIDE_COLUMN_GAP = 14 * layoutScale;
  const SIDE_MAX_PER_COLUMN = 3;
  const padding = 80 * layoutScale;

  const chatVisibleRef = useRef(!!chatVisible);

  useEffect(() => {
    chatVisibleRef.current = !!chatVisible;

    if (chatVisible) setLastChats({});
  }, [chatVisible]);

  useRoomChatSubscription({
    variables: { roomId: room?.id ?? "" },
    skip: !room?.id,
    onData: ({ data }) => {
      if (chatVisibleRef.current) return;

      const msg = data?.data?.roomChat;
      if (!msg) return;

      const { userId, formattedContent, content } = msg;

      let message = formattedContent || content;

      if (msg.username) setSenderName(msg.username);

      try {
        if (/^[A-Za-z0-9+/=]+$/.test(message) && message.length > 40) {
          message = decompressMessage(message);
        }
      } catch (err) {
        console.warn("Decompression failed for chat message:", err);
      }

      setLastChats((prev) => ({ ...prev, [userId]: message }));
    }
  });

  useRoomReactionsSubscription({
    variables: { roomId: room?.id ?? "" },
    skip: !room?.id,
    onData: ({ data }) => {
      const reaction = data.data?.roomReactions;
      if (!reaction) return;

      setActiveReactions((current) => ({
        ...current,
        [reaction.userId]: reaction
      }));

      clearTimeout(reactionTimers.current[reaction.userId]);
      reactionTimers.current[reaction.userId] = setTimeout(() => {
        setActiveReactions((current) => {
          if (current[reaction.userId]?.id !== reaction.id) return current;
          const next = { ...current };
          delete next[reaction.userId];
          return next;
        });
        delete reactionTimers.current[reaction.userId];
      }, 1800);
    }
  });

  useEffect(
    () => () => {
      Object.values(reactionTimers.current).forEach(clearTimeout);
    },
    []
  );

  useEffect(() => {
    if (!room?.isGameOver) setActiveReactions({});
  }, [room?.isGameOver]);

  useEffect(() => {
    const updateTableRect = () => {
      if (tableRef.current)
        setTableRect(tableRef.current.getBoundingClientRect());
    };

    updateTableRect();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateTableRect);
    if (tableRef.current) observer?.observe(tableRef.current);

    window.addEventListener("resize", updateTableRect);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateTableRect);
    };
  }, []);

  const seatLayout = useMemo(() => {
    if (!tableRect || !room) return null;

    const totalPlayers = users.length;
    const { width } = tableRect;

    const TB_MIN_GAP = CARD_WIDTH + 24 * layoutScale;

    const TB_PER_ROW = Math.max(1, Math.floor(width / TB_MIN_GAP));

    const sideCounts = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };

    if (totalPlayers < 4) {
      if (totalPlayers === 1) {
        sideCounts.top = 1;
      } else if (totalPlayers === 2) {
        sideCounts.top = 1;
        sideCounts.bottom = 1;
      } else if (totalPlayers === 3) {
        sideCounts.top = 1;
        sideCounts.left = 1;
        sideCounts.right = 1;
      }

      const topRows = sideCounts.top > 0 ? 1 : 0;
      const bottomRows = sideCounts.bottom > 0 ? 1 : 0;
      const leftColumns = Math.ceil(sideCounts.left / SIDE_MAX_PER_COLUMN);
      const rightColumns = Math.ceil(sideCounts.right / SIDE_MAX_PER_COLUMN);

      return {
        sideCounts,
        topRows,
        bottomRows,
        leftColumns,
        rightColumns,
        TB_PER_ROW
      };
    }

    const playersPerSide = Math.floor(totalPlayers / 4);
    sideCounts.top = playersPerSide;
    sideCounts.right = playersPerSide;
    sideCounts.bottom = playersPerSide;
    sideCounts.left = playersPerSide;

    const remainderOrder: (keyof typeof sideCounts)[] = [
      "bottom",
      "top",
      "right",
      "left"
    ];
    for (let index = 0; index < totalPlayers % 4; index += 1) {
      sideCounts[remainderOrder[index]] += 1;
    }

    const topRows = Math.ceil(sideCounts.top / TB_PER_ROW);
    const bottomRows = Math.ceil(sideCounts.bottom / TB_PER_ROW);
    const leftColumns = Math.ceil(sideCounts.left / SIDE_MAX_PER_COLUMN);
    const rightColumns = Math.ceil(sideCounts.right / SIDE_MAX_PER_COLUMN);

    return {
      sideCounts,
      topRows,
      bottomRows,
      leftColumns,
      rightColumns,
      TB_PER_ROW
    };
  }, [CARD_WIDTH, SIDE_MAX_PER_COLUMN, layoutScale, room, tableRect, users]);

  const playerPositions = useMemo(() => {
    if (!tableRect || !room || !seatLayout) return [];

    const totalPlayers = users.length;
    const { width, height } = tableRect;

    // ---------- Layout tuning ----------
    const TB_MIN_GAP = CARD_WIDTH + 24 * layoutScale;

    // ---------- Helpers ----------
    const clampCenteredCoords = (
      len: number,
      count: number,
      minGap: number
    ) => {
      if (count <= 0) return [];

      if (count === 1) return [len / 2];

      const gap = Math.max(minGap, len / (count + 1));
      const span = gap * (count - 1);
      const start = (len - span) / 2;
      return Array.from({ length: count }, (_, i) => start + i * gap);
    };

    const computeSidePositions = (
      side: "top" | "right" | "bottom" | "left",
      count: number
    ): Position[] => {
      if (count === 0) return [];

      const positions: Position[] = [];

      // ---------- TOP / BOTTOM ----------
      if (side === "top" || side === "bottom") {
        const available = width;

        const perRow = Math.max(1, Math.floor(available / TB_MIN_GAP));
        const rows = Math.ceil(count / perRow);

        for (let row = 0; row < rows; row++) {
          const rowCount = row === rows - 1 ? count - row * perRow : perRow;

          const xs = clampCenteredCoords(available, rowCount, TB_MIN_GAP);

          for (let i = 0; i < rowCount; i++) {
            const rowOffset = padding + row * TB_ROW_OFFSET;
            positions.push({
              x: xs[i],
              y: side === "top" ? -rowOffset : height + rowOffset
            });
          }
        }

        return positions;
      }

      // ---------- LEFT / RIGHT ----------
      const available = height;
      const columns = Math.ceil(count / SIDE_MAX_PER_COLUMN);

      for (let col = 0; col < columns; col++) {
        const colCount =
          col === columns - 1
            ? count - col * SIDE_MAX_PER_COLUMN
            : SIDE_MAX_PER_COLUMN;

        const ys = clampCenteredCoords(
          available,
          colCount,
          CARD_HEIGHT + CARD_MARGIN
        );

        const colOffset = padding + col * (CARD_WIDTH + SIDE_COLUMN_GAP);

        for (let i = 0; i < colCount; i++) {
          positions.push({
            x: side === "left" ? -colOffset : width + colOffset,
            y: ys[i]
          });
        }
      }

      return positions;
    };

    // ---------- Small player count fallback ----------
    if (totalPlayers === 1) {
      return [{ x: width / 2, y: -padding }];
    }

    if (totalPlayers === 2) {
      return [
        { x: width / 2, y: -padding },
        { x: width / 2, y: height + padding }
      ];
    }

    if (totalPlayers === 3) {
      return [
        { x: width / 2, y: -padding },
        { x: width + padding, y: height / 2 },
        { x: -padding, y: height / 2 }
      ];
    }

    const { sideCounts } = seatLayout;

    // ---------- Build positions ----------
    return [
      ...computeSidePositions("top", sideCounts.top),
      ...computeSidePositions("right", sideCounts.right),
      ...computeSidePositions("bottom", sideCounts.bottom),
      ...computeSidePositions("left", sideCounts.left)
    ];
  }, [
    CARD_HEIGHT,
    CARD_MARGIN,
    CARD_WIDTH,
    SIDE_COLUMN_GAP,
    TB_ROW_OFFSET,
    layoutScale,
    padding,
    room,
    seatLayout,
    tableRect,
    users
  ]);

  const playerPositionMap = useMemo(() => {
    if (!room || playerPositions.length === 0) return {};
    const map: Record<string, { x: number; y: number }> = {};
    users.forEach((user, i) => {
      const pos = playerPositions[i];
      if (pos) map[user.id] = pos;
    });
    return map;
  }, [room, playerPositions, users]);

  const containerSize = useMemo(() => {
    if (!tableRect || !seatLayout) return null;

    const { sideCounts, topRows, bottomRows, leftColumns, rightColumns } =
      seatLayout;

    // Vertical expansion
    const topHeight =
      sideCounts.top > 0
        ? padding + Math.max(topRows - 1, 0) * TB_ROW_OFFSET
        : 0;

    const bottomHeight =
      sideCounts.bottom > 0
        ? padding + (bottomRows - 1) * TB_ROW_OFFSET + CARD_HEIGHT
        : 0;

    // Horizontal expansion
    const leftWidth =
      leftColumns > 0
        ? padding +
          (leftColumns - 1) * (CARD_WIDTH + SIDE_COLUMN_GAP) +
          CARD_WIDTH
        : 0;

    const rightWidth =
      rightColumns > 0
        ? padding +
          (rightColumns - 1) * (CARD_WIDTH + SIDE_COLUMN_GAP) +
          CARD_WIDTH
        : 0;

    return {
      width: tableRect.width + leftWidth + rightWidth,
      height: tableRect.height + topHeight + bottomHeight,
      offsetX: leftWidth,
      offsetY: topHeight,
      topHeight,
      bottomHeight
    };
  }, [
    CARD_HEIGHT,
    CARD_WIDTH,
    SIDE_COLUMN_GAP,
    TB_ROW_OFFSET,
    padding,
    seatLayout,
    tableRect
  ]);

  const totalHeight = useMemo(() => {
    if (!containerSize || !tableRect || !seatLayout) {
      return {
        minHeight: 0,
        offsetHeight: 0
      };
    }

    const { topRows, bottomRows } = seatLayout;

    const heightRows = tableRect.height + (topRows + bottomRows) * CARD_HEIGHT;
    const singleRowHeight = Math.max(
      window.innerHeight / 1.8 - heightRows,
      (heightRows - TB_ROW_OFFSET) / (topRows + bottomRows)
    );
    const doubleRowHeight = Math.max(
      window.innerHeight / 1.35 - heightRows,
      (heightRows - TB_ROW_OFFSET) / (topRows + bottomRows)
    );
    const calculatedOffset =
      topRows > 1
        ? doubleRowHeight
        : topRows < 1 && bottomRows < 1
        ? window.innerHeight / 3
        : singleRowHeight;
    const topSeatClearance =
      topRows > 0
        ? padding +
          Math.max(topRows - 1, 0) * TB_ROW_OFFSET +
          CARD_HEIGHT / 2 +
          12
        : 0;

    return {
      minHeight: heightRows,
      // Absolutely positioned seats can extend above the table. Keep the
      // outermost row, including half of its card, inside the room scroller
      // instead of letting the fixed header clip it.
      offsetHeight: Math.max(calculatedOffset, topSeatClearance)
    };
  }, [
    CARD_HEIGHT,
    TB_ROW_OFFSET,
    containerSize,
    padding,
    seatLayout,
    tableRect
  ]);

  if (!room) {
    return (
      <div className="flex items-center justify-center w-full h-[calc(100vh-120px)]">
        Loading...
      </div>
    );
  }

  const handlePromote = async (userId: string, room: Room) => {
    const res = await setRoomOwner({
      variables: {
        roomId: room.id,
        userId
      }
    });

    if (res.errors?.length) {
      throw new Error(res.errors[0].message);
    }
  };

  return (
    <div
      className="relative w-full flex justify-center"
      style={{
        minWidth: containerSize ? containerSize.width - 30 : 100,
        minHeight: totalHeight["minHeight"]
      }}
    >
      <div
        className="relative"
        style={{ marginTop: totalHeight["offsetHeight"] }}
      >
        {/* Table */}
        <Table
          room={room}
          innerRef={tableRef}
          isGameOver={room.isGameOver}
          roomOverlayRef={roomRef ?? null}
        />

        {/* Player Cards */}
        {users.map((user, index) => {
          const position = playerPositions[index];
          if (!position) return null;
          const pickedCard = getPickedUserCard(user.id, room.game.table);

          return (
            <div
              key={user.id}
              ref={(el) => {
                playerRefs.current[user.id] = el;
              }}
              data-player-id={user.id}
              className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 pt-[max(2vh,8px)] pb-[max(2vh,8px)] hover:z-[100] focus-within:z-[100]"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`
              }}
            >
              <div
                style={{
                  transform: `scale(${layoutScale})`,
                  transformOrigin: "center"
                }}
              >
                <Player
                  user={user}
                  room={room}
                  isCardPicked={!!pickedCard}
                  isGameOver={room.isGameOver}
                  card={pickedCard?.card}
                  roomId={room.id}
                  onMakeOwner={handlePromote}
                  playerPositionMap={playerPositionMap}
                  tableRect={tableRect}
                  chatVisible={chatVisible}
                  reaction={activeReactions[user.id]}
                />
              </div>
            </div>
          );
        })}

        {/* Chat Bubbles */}
        {Object.entries(lastChats).map(([senderId, message]) => {
          if (!message || chatVisible) return null;
          const rect = getPlayerAnchorRect(senderId);
          if (!rect) return null;

          return (
            <ChatBubble
              key={senderId + message}
              message={message}
              playerId={senderId}
              senderName={senderName ?? ""}
              anchorRect={rect ?? undefined}
              onExpire={(pid) =>
                setLastChats((prev) => ({ ...prev, [pid]: null }))
              }
              onShowInChat={onShowInChat}
            />
          );
        })}
      </div>
    </div>
  );
}
