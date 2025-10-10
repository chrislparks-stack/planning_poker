import { ReloadIcon } from "@radix-ui/react-icons";
import { FC } from "react";

import { useResetGameMutation, useShowCardsMutation } from "@/api";
import { useModal } from "@/components/ConfirmationDialog/useModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Room } from "@/types";

interface TableProps {
  room: Room;
  isCardsPicked: boolean; // same meaning as before
  isGameOver: boolean;
  innerRef: React.RefObject<HTMLDivElement | null>;
}

type TableEntry = {
  userId?: string | null;
  user?: { id?: string | null } | null;
  card?: string | null;
};

export const Table: FC<TableProps> = ({
  room,
  isCardsPicked,
  isGameOver,
  innerRef
}) => {
  const { toast } = useToast();

  const startNewGame = useModal({
    title: "Are you sure you want to start a new game?",
    description: "This will reset the current game.",
    confirmationText: "Start new game",
    cancellationText: "Cancel"
  });

  const [showCardsMutation, { loading: showCardLoading }] =
    useShowCardsMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Show cards: ${error.message}`,
          variant: "destructive"
        });
      }
    });

  const [resetGameMutation, { loading: resetGameLoading }] =
    useResetGameMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Reset game: ${error.message}`,
          variant: "destructive"
        });
      }
    });

  // current viewer id (from localStorage user)
  const currentUserId =
    typeof window !== "undefined"
      ? (() => {
          try {
            const raw = localStorage.getItem("user");
            if (!raw) return undefined;
            const parsed = JSON.parse(raw) as { id?: string } | null;
            return parsed?.id;
          } catch {
            return undefined;
          }
        })()
      : undefined;

  // is the current viewer the room owner?
  const currentIsRoomOwner =
    room.roomOwnerId !== undefined && room.roomOwnerId !== null
      ? room.roomOwnerId === currentUserId
      : false;

  // Find the current user's table entry (if any) and whether they've selected a card
  const table = (room.game?.table ?? []) as TableEntry[];
  const currentEntry = currentUserId
    ? table.find((t) => (t.userId ?? t.user?.id ?? null) === currentUserId)
    : undefined;
  const hasSelectedOwnCard = Boolean(currentEntry?.card);
  const selectedCardLabel = currentEntry?.card ?? "";

  // handlers (use room.id for mutations)
  function handleShowCards() {
    if (!currentIsRoomOwner) {
      toast({
        title: "Not allowed",
        description: "Only the room owner can reveal cards.",
        variant: "destructive"
      });
      return;
    }
    showCardsMutation({ variables: { roomId: room.id } });
  }

  function handleResetGame() {
    if (!currentIsRoomOwner) {
      toast({
        title: "Not allowed",
        description: "Only the room owner can start a new game.",
        variant: "destructive"
      });
      return;
    }
    startNewGame().then(() => {
      resetGameMutation({ variables: { roomId: room.id } });
    });
  }

  return (
    <div
      ref={innerRef}
      className="flex justify-center items-center w-[25vw] max-w-72 min-w-48 h-36 rounded-full border-2 border-s-4 border-e-4 border-gray-500"
    >
      {isCardsPicked ? (
        isGameOver ? (
          // Game over -> owner sees Start New Game button, others see vote + waiting text
          currentIsRoomOwner ? (
            <Button
              onClick={handleResetGame}
              disabled={resetGameLoading}
              className="w-36"
              size="lg"
            >
              {resetGameLoading && (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start New Game
            </Button>
          ) : hasSelectedOwnCard ? (
            <div className="flex flex-col items-center text-center">
              <span className="text-sm font-semibold">
                You voted:{" "}
                <span className="ml-1 font-mono tabular-nums">
                  {selectedCardLabel}
                </span>
              </span>
              <span className="text-xs text-accent mt-1">
                Waiting to start new game...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <span className="text-sm text-muted-foreground">No vote yet</span>
              <span className="text-xs text-accent mt-1">
                Waiting to start new game...
              </span>
            </div>
          )
        ) : currentIsRoomOwner ? (
          // Cards picked & not game over -> owner reveals
          <Button
            onClick={handleShowCards}
            disabled={showCardLoading}
            size="lg"
          >
            {showCardLoading && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reveal cards
          </Button>
        ) : hasSelectedOwnCard ? (
          // Non-owner who has voted
          <div className="flex flex-col items-center text-center">
            <span className="text-sm font-semibold">
              You voted:{" "}
              <span className="ml-1 font-mono tabular-nums">
                {selectedCardLabel}
              </span>
            </span>
            <span className="text-xs text-accent mt-1">
              Waiting to reveal cards...
            </span>
          </div>
        ) : (
          // Non-owner who hasn't voted (rare when isCardsPicked true)
          <div className="flex flex-col items-center text-center">
            <span className="text-sm text-muted-foreground">
              Select card to vote
            </span>
            <span className="text-xs text-accent mt-1">
              Waiting to reveal cards...
            </span>
          </div>
        )
      ) : // Not all cards picked yet
      hasSelectedOwnCard && !currentIsRoomOwner ? (
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-semibold text-accent">
            Waiting to reveal cards...
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            The owner will reveal when ready.
          </span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">
          Select card to vote
        </span>
      )}
    </div>
  );
};
