import { useRef, useEffect, useState, useMemo } from "react";

import { Player } from "@/components/Player";
import { Table } from "@/components/Table";
import { Room as RoomType } from "@/types";
import { getPickedUserCard } from "@/utils";

interface RoomProps {
  room?: RoomType;
}

interface Position {
  x: number;
  y: number;
}

export function Room({ room }: RoomProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);

  // Update the table's bounding rectangle on mount and when the window is resized.
  useEffect(() => {
    const updateTableRect = () => {
      if (tableRef.current) {
        setTableRect(tableRef.current.getBoundingClientRect());
      }
    };

    updateTableRect();
    window.addEventListener("resize", updateTableRect);
    return () => window.removeEventListener("resize", updateTableRect);
  }, []);

  /**
   * Compute player positions along the table edges while avoiding overlaps.
   * Each side’s available length and a minimum gap (based on card dimensions)
   * are used to determine the optimal placement.
   */
  const playerPositions: Position[] = useMemo(() => {
    if (!tableRect || !room) return [];

    const totalPlayers = room.users.length;
    const { width, height } = tableRect;
    const padding = 80; // Offset from the table edge
    const CARD_WIDTH = 52;
    const CARD_HEIGHT = 80;
    const CARD_MARGIN = 20;

    const computeSidePositions = (side: "top" | "right" | "bottom" | "left", count: number): Position[] => {
      const positions: Position[] = [];
      const availableLength = side === "top" || side === "bottom" ? width : height;
      const minGap = side === "top" || side === "bottom" ? CARD_WIDTH + CARD_MARGIN : CARD_HEIGHT + CARD_MARGIN;

      const coordinates: number[] = [];
      if (count === 0) return [];

      // Default even spacing along the side.
      const defaultSpacing = availableLength / (count + 1);
      if (defaultSpacing < minGap) {
        // Not enough space – use fixed spacing with the minimum gap, then center.
        const totalRequired = minGap * (count - 1);
        const start = (availableLength - totalRequired) / 2;
        for (let j = 0; j < count; j++) {
          coordinates.push(start + j * minGap);
        }
      } else {
        // Use default fractional positioning.
        for (let j = 0; j < count; j++) {
          coordinates.push((j + 1) * defaultSpacing);
        }
      }

      // Convert the computed coordinate to a (x,y) position based on the side.
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

    // For fewer than 4 players, assign one per side.
    if (totalPlayers < 4) {
      const availableSides: ("top" | "right" | "bottom" | "left")[] = ["top", "right", "bottom", "left"];
      for (let i = 0; i < totalPlayers; i++) {
        const side = availableSides[i];
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

    // For 4 or more players, distribute them evenly across the four sides.
    const base = Math.floor(totalPlayers / 4);
    const remainder = totalPlayers % 4;
    const sideCounts: { [key in "top" | "right" | "bottom" | "left"]: number } = {
      top: base,
      right: base,
      bottom: base,
      left: base,
    };

    // Favor extra seats based on table orientation.
    const extraOrder: ("top" | "right" | "bottom" | "left")[] =
      width >= height ? ["top", "bottom", "right", "left"] : ["right", "left", "top", "bottom"];
    for (let i = 0; i < remainder; i++) {
      sideCounts[extraOrder[i]] += 1;
    }

    positions.push(...computeSidePositions("top", sideCounts.top));
    positions.push(...computeSidePositions("right", sideCounts.right));
    positions.push(...computeSidePositions("bottom", sideCounts.bottom));
    positions.push(...computeSidePositions("left", sideCounts.left));

    return positions;
  }, [tableRect, room]);

  if (!room) {
    return <div className="flex items-center justify-center w-full h-[calc(100vh-120px)]">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-120px)]">
      <div className="relative">
        <Table
          innerRef={tableRef}
          roomId={room.id}
          isCardsPicked={room.game.table.length > 0}
          isGameOver={room.isGameOver}
        />
        {room.users.map((user, index) => {
          const position = playerPositions[index];
          if (!position) return null;
          const pickedCard = getPickedUserCard(user.id, room.game.table);
          return (
            <div
              key={user.id}
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
