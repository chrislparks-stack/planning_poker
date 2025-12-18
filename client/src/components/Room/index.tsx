import {useRef, useEffect, useState, useMemo, RefObject} from "react";
import {
  useSetRoomOwnerMutation,
  useRoomChatSubscription,
} from "@/api";
import { Player } from "@/components/Player";
import { Table } from "@/components/Table";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { Room as RoomType } from "@/types";
import { getPickedUserCard } from "@/utils";
import {decompressMessage} from "@/utils/messageUtils.ts";
import {withTestUsers} from "@/utils/testUtils.tsx";

interface RoomProps {
  room?: RoomType;
  onShowInChat?: () => void;
  roomRef?: RefObject<HTMLDivElement | null>;
}

export interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

function handlePromote(userId: string, room: RoomType) {
  useSetRoomOwnerMutation({ variables: { roomId: room["id"] || "", userId } });
}

export function Room({ room, onShowInChat, roomRef}: RoomProps) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const playerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [senderName, setSenderName] = useState<string | null>(null);
  const [lastChats, setLastChats] = useState<Record<string, string | null>>({});
  const [chatPositionMap, setChatPositionMap] = useState<
    Record<string, Position | null>
  >({});
  const users = useMemo(
    () => withTestUsers(0, room?.users),
    [room?.users]
  );

  // Layout constants
  const CARD_WIDTH = 60;
  const CARD_HEIGHT = 96;
  const CARD_MARGIN = 20;

  const TB_ROW_OFFSET = CARD_HEIGHT + 14;
  const SIDE_COLUMN_GAP = 14;
  const SIDE_MAX_PER_COLUMN = 3;

  const padding = 80;

  useRoomChatSubscription({
    variables: { roomId: room?.id ?? "" },
    skip: !room?.id,
    onData: ({ data }) => {
      const msg = data?.data?.roomChat;
      if (!msg) return;

      const { userId, formattedContent, content, position } = msg as any;

      // --- Decompression step ---
      let message = formattedContent || content;

      if (msg.username) {
        setSenderName(msg.username);
      }

      try {
        // Detect base64-ish compressed payloads (long strings with mostly base64 chars)
        if (/^[A-Za-z0-9+/=]+$/.test(message) && message.length > 40) {
          message = decompressMessage(message);
        }
      } catch (err) {
        console.warn("Decompression failed for chat message:", err);
      }

      // --- Update recent chat text for that user ---
      setLastChats((prev) => ({ ...prev, [userId]: message }));

      // --- Handle positional chat bubble ---
      if (position && typeof position === "object") {
        const { x, y, width, height } = position;
        const scaled = {
          x: x * window.innerWidth,
          y: y * window.innerHeight,
          width: width * window.innerWidth,
          height: height * window.innerHeight,
        };
        setChatPositionMap((prev) => ({ ...prev, [userId]: scaled }));
        return;
      }

      setChatPositionMap((prev) => ({ ...prev, [userId]: null }));
    },
  });

  useEffect(() => {
    const updateTableRect = () => {
      if (tableRef.current)
        setTableRect(tableRef.current.getBoundingClientRect());
    };
    updateTableRect();
    window.addEventListener("resize", updateTableRect);
    return () => window.removeEventListener("resize", updateTableRect);
  }, []);

  const seatLayout = useMemo(() => {
    if (!tableRect || !room) return null;

    const totalPlayers = users.length;
    const { width } = tableRect;

    const TB_MIN_GAP = CARD_WIDTH + 24;

    // Allow top/bottom second row only if viewport is tall enough
    const allowTBSecondRow = window.innerHeight / 5.5 > CARD_HEIGHT * 2;
    const MAX_TB_ROWS = allowTBSecondRow ? 2 : 1;
    const TB_PER_ROW = Math.max(1, Math.floor(width / TB_MIN_GAP));

    const sideCounts = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };

    let remaining = totalPlayers;

    // First row top & bottom
    const baseTB = Math.min(TB_PER_ROW, Math.floor(remaining / 4));
    sideCounts.top = baseTB;
    sideCounts.bottom = baseTB;
    remaining -= baseTB * 2;

    // Optional second row
    if (MAX_TB_ROWS === 2 && remaining > 0) {
      const extraTB = Math.min(TB_PER_ROW, Math.floor(remaining / 2));
      sideCounts.top += extraTB;
      sideCounts.bottom += extraTB;
      remaining -= extraTB * 2;
    }

    // Everything else goes left/right
    sideCounts.left = Math.ceil(remaining / 2);
    sideCounts.right = remaining - sideCounts.left;

    if (totalPlayers < 4) {
      const sideCounts = { top: 0, bottom: 0, left: 0, right: 0 };

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
        TB_PER_ROW,
      }
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
      TB_PER_ROW,
    };
  }, [tableRect, room, users]);

  const playerPositions = useMemo(() => {
    if (!tableRect || !room || !seatLayout) return [];

    const totalPlayers = users.length;
    const { width, height } = tableRect;

    // ---------- Layout tuning ----------
    const SIDE_MAX_PER_COLUMN = 3;

    const TB_MIN_GAP = CARD_WIDTH + 24;

    // ---------- Helpers ----------
    const clampCenteredCoords = (
      len: number,
      count: number,
      minGap: number
    ) => {
      if (count <= 0) return [];

      const natural = len / (count + 1);
      if (natural >= minGap) {
        return Array.from({ length: count }, (_, i) => (i + 1) * natural);
      }

      const total = minGap * (count - 1);
      const start = (len - total) / 2;
      return Array.from({ length: count }, (_, i) => start + i * minGap);
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
          const rowCount =
            row === rows - 1 ? count - row * perRow : perRow;

          const xs = clampCenteredCoords(
            available,
            rowCount,
            TB_MIN_GAP
          );

          for (let i = 0; i < rowCount; i++) {
            const rowOffset = padding + row * TB_ROW_OFFSET;
            positions.push({
              x: xs[i],
              y:
                side === "top"
                  ? -rowOffset
                  : height + rowOffset,
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

        const colOffset =
          padding + col * (CARD_WIDTH + SIDE_COLUMN_GAP);

        for (let i = 0; i < colCount; i++) {
          positions.push({
            x:
              side === "left"
                ? -colOffset
                : width + colOffset,
            y: ys[i],
          });
        }
      }

      return positions;
    };

    // ---------- Small player count fallback ----------
    if (totalPlayers < 4) {
      const sides: ("top" | "right" | "bottom" | "left")[] = [
        "top",
        "right",
        "bottom",
        "left",
      ];

      return users.map((_, i) => {
        const side = sides[i];
        switch (side) {
          case "top":
            return { x: width / 2, y: -padding };
          case "right":
            return { x: width + padding, y: height / 2 };
          case "bottom":
            return { x: width / 2, y: height + padding };
          case "left":
            return { x: -padding, y: height / 2 };
        }
      });
    }

    const { sideCounts } = seatLayout;

    // ---------- Build positions ----------
    return [
      ...computeSidePositions("top", sideCounts.top),
      ...computeSidePositions("right", sideCounts.right),
      ...computeSidePositions("bottom", sideCounts.bottom),
      ...computeSidePositions("left", sideCounts.left),
    ];
  }, [tableRect, room, users]);

  const playerPositionMap = useMemo(() => {
    if (!room || playerPositions.length === 0) return {};
    const map: Record<string, { x: number; y: number }> = {};
    users.forEach((user, i) => {
      const pos = playerPositions[i];
      if (pos) map[user.id] = pos;
    });
    return map;
  }, [room, playerPositions]);

  if (!room) {
    return (
      <div className="flex items-center justify-center w-full h-[calc(100vh-120px)]">
        Loading...
      </div>
    );
  }

  const containerSize = useMemo(() => {
    if (!tableRect || !seatLayout) return null;

    const {
      sideCounts,
      topRows,
      bottomRows,
      leftColumns,
      rightColumns,
    } = seatLayout;

    // Vertical expansion
    const topHeight =
      sideCounts.top > 0
        ? padding + (Math.max(topRows - 1, 0) * TB_ROW_OFFSET)
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
      bottomHeight,
    };
  }, [tableRect, seatLayout]);

  const totalHeight = useMemo(() => {
    if (!containerSize || !tableRect || !seatLayout) {
      return {
        minHeight: 0,
        offsetHeight: 0
      };
    }

    const { topRows, bottomRows } = seatLayout;

    const heightRows = tableRect.height + ((topRows + bottomRows) * CARD_HEIGHT)
    const singleRowHeight = Math.max(((window.innerHeight / 1.8) - heightRows), ((heightRows - TB_ROW_OFFSET) / (topRows + bottomRows)));
    const doubleRowHeight = Math.max(((window.innerHeight / 1.35) - heightRows), ((heightRows - TB_ROW_OFFSET) / (topRows + bottomRows)));

    return {
      minHeight: heightRows,
      offsetHeight: topRows > 1 ? doubleRowHeight : singleRowHeight
    };
  }, [containerSize, tableRect, seatLayout]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        minWidth: containerSize ? containerSize.width - 30 : 100,
        minHeight: totalHeight["minHeight"]
      }}
    >
      <div
        className="relative"
        style={{marginTop: totalHeight["offsetHeight"]}}
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
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 10,
              }}
            >
              <Player
                user={user}
                isCardPicked={!!pickedCard}
                isGameOver={room.isGameOver}
                card={pickedCard?.card}
                roomId={room.id}
                onMakeOwner={handlePromote}
                playerPositionMap={playerPositionMap}
                tableRect={tableRect}
              />
            </div>
          );
        })}

        {/* Chat Bubbles */}
        {Object.entries(lastChats).map(([senderId, message]) => {
          if (!message) return null;
          const pos = chatPositionMap[senderId];
          return (
            <ChatBubble
              key={senderId + message}
              message={message}
              playerId={senderId}
              senderName={senderName ?? ""}
              absolutePosition={pos ?? undefined}
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
