import { useRef, useEffect, useState, useMemo } from "react";
import {
  useSetRoomOwnerMutation,
  useRoomChatSubscription,
} from "@/api";
import { Player } from "@/components/Player";
import { Table } from "@/components/Table";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { Room as RoomType } from "@/types";
import { getPickedUserCard } from "@/utils";

interface RoomProps {
  room?: RoomType;
}

export interface Position {
  x: number;
  y: number;
}

export function Room({ room }: RoomProps) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const playerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [setRoomOwner] = useSetRoomOwnerMutation();
  const [lastChats, setLastChats] = useState<Record<string, string | null>>({});

  // --- Chat Subscription ------------------------------------------------------
  useRoomChatSubscription({
    variables: { roomId: room?.id ?? "" },
    skip: !room?.id,
    onData: ({ data }) => {
      const msg = data?.data?.roomChat;
      if (!msg) return;
      const { userId, formattedContent, content } = msg;
      const message = formattedContent || content;
      setLastChats((prev) => ({ ...prev, [userId]: message }));
    },
  });

  // --- Track Table Rect -------------------------------------------------------
  useEffect(() => {
    const updateTableRect = () => {
      if (tableRef.current)
        setTableRect(tableRef.current.getBoundingClientRect());
    };
    updateTableRect();
    window.addEventListener("resize", updateTableRect);
    return () => window.removeEventListener("resize", updateTableRect);
  }, []);

  // --- Player Positioning -----------------------------------------------------
  const playerPositions = useMemo(() => {
    if (!tableRect || !room) return [];
    const totalPlayers = room.users.length;
    const { width, height } = tableRect;
    const padding = 80;
    const CARD_WIDTH = 52;
    const CARD_HEIGHT = 80;
    const CARD_MARGIN = 20;

    const computeSidePositions = (
      side: "top" | "right" | "bottom" | "left",
      count: number
    ): Position[] => {
      const positions: Position[] = [];
      const availableLength =
        side === "top" || side === "bottom" ? width : height;
      const minGap =
        side === "top" || side === "bottom"
          ? CARD_WIDTH + CARD_MARGIN
          : CARD_HEIGHT + CARD_MARGIN;

      const coordinates: number[] = [];
      if (count === 0) return [];

      const defaultSpacing = availableLength / (count + 1);
      if (defaultSpacing < minGap) {
        const totalRequired = minGap * (count - 1);
        const start = (availableLength - totalRequired) / 2;
        for (let j = 0; j < count; j++)
          coordinates.push(start + j * minGap);
      } else {
        for (let j = 0; j < count; j++)
          coordinates.push((j + 1) * defaultSpacing);
      }

      for (const coord of coordinates) {
        let x = 0,
          y = 0;
        switch (side) {
          case "top":
            x = coord;
            y = -padding;
            break;
          case "bottom":
            x = coord;
            y = height + padding;
            break;
          case "left":
            x = -padding;
            y = coord;
            break;
          case "right":
            x = width + padding;
            y = coord;
            break;
        }
        positions.push({ x, y });
      }
      return positions;
    };

    const positions: Position[] = [];
    if (totalPlayers < 4) {
      const sides: ("top" | "right" | "bottom" | "left")[] = [
        "top",
        "right",
        "bottom",
        "left",
      ];
      for (let i = 0; i < totalPlayers; i++) {
        const side = sides[i];
        let pos: Position;
        switch (side) {
          case "top":
            pos = { x: width / 2, y: -padding };
            break;
          case "right":
            pos = { x: width + padding, y: height / 2 };
            break;
          case "bottom":
            pos = { x: width / 2, y: height + padding };
            break;
          case "left":
            pos = { x: -padding, y: height / 2 };
            break;
        }
        positions.push(pos);
      }
      return positions;
    }

    const base = Math.floor(totalPlayers / 4);
    const remainder = totalPlayers % 4;
    const sideCounts = { top: base, right: base, bottom: base, left: base };
    const extraOrder: ("top" | "right" | "bottom" | "left")[] =
      width >= height
        ? ["top", "bottom", "right", "left"]
        : ["right", "left", "top", "bottom"];
    for (let i = 0; i < remainder; i++)
      sideCounts[extraOrder[i]] += 1;

    positions.push(...computeSidePositions("top", sideCounts.top));
    positions.push(...computeSidePositions("right", sideCounts.right));
    positions.push(...computeSidePositions("bottom", sideCounts.bottom));
    positions.push(...computeSidePositions("left", sideCounts.left));

    return positions;
  }, [tableRect, room]);

  // --- Map Players to Positions -----------------------------------------------
  const playerPositionMap = useMemo(() => {
    if (!room || playerPositions.length === 0) return {};
    const map: Record<string, { x: number; y: number }> = {};
    room.users.forEach((user, i) => {
      const pos = playerPositions[i];
      if (pos) map[user.id] = pos;
    });
    return map;
  }, [room, playerPositions]);

  // --- Early Exit -------------------------------------------------------------
  if (!room) {
    return (
      <div className="flex items-center justify-center w-full h-[calc(100vh-120px)]">
        Loading...
      </div>
    );
  }

  // --- Promote Helper ---------------------------------------------------------
  function handlePromote(userId: string) {
    setRoomOwner({ variables: { roomId: room?.id || "", userId } });
  }

  // --- Render -----------------------------------------------------------------
  return (
    <div
      className="relative flex flex-col items-center justify-center w-full min-h-[450px]"
      style={{
        height: "calc(50vh)",
        overflow: "hidden",
        position: "relative",
        transform: "translateY(calc(25% - 1vh))",
      }}
    >
      <div className="relative">
        {/* Table */}
        <Table
          room={room}
          innerRef={tableRef}
          isCardsPicked={room.game.table.length > 0}
          isGameOver={room.isGameOver}
        />

        {/* Player Cards */}
        {room.users.map((user, index) => {
          const position = playerPositions[index];
          if (!position) return null;
          const pickedCard = getPickedUserCard(user.id, room.game.table);

          return (
            <div
              key={user.id}
              ref={(el) => (playerRefs.current[user.id] = el)}
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

        {Object.entries(lastChats).map(([senderId, message]) =>
          message ? (
            <ChatBubble
              key={senderId + message}
              message={message}
              playerId={senderId}
              playerRef={playerRefs.current[senderId]}
              tableRect={tableRect}
              onExpire={(pid) =>
                setLastChats((prev) => ({ ...prev, [pid]: null }))
              }
            />
          ) : null
        )}
      </div>
    </div>
  );
}
