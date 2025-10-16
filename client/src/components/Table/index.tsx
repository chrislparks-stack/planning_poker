import { ReloadIcon } from "@radix-ui/react-icons";
import { FC, useEffect, useRef, useState } from "react";

import {
  useCancelRevealCountdownMutation,
  useResetGameMutation,
  useShowCardsMutation,
  useStartRevealCountdownMutation
} from "@/api";
import { useModal } from "@/components/ConfirmationDialog/useModal";
import { Button } from "@/components/ui/button";
import { CountdownOverlay } from "@/components/ui/countdown-overlay.tsx";
import { useToast } from "@/hooks/use-toast";
import type { Room } from "@/types";

interface TableProps {
  room: Room;
  isCardsPicked: boolean;
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

  const [startRevealCountdown, { loading: countdownLoading }] =
    useStartRevealCountdownMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Countdown: ${error.message}`,
          variant: "destructive"
        });
      }
    });

  const [cancelRevealCountdownMutation] = useCancelRevealCountdownMutation({
    onError: (error) => {
      toast({
        title: "Error",
        description: `Cancel countdown: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // ===== Current user tracking =====
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

  const currentIsRoomOwner =
    room.roomOwnerId !== undefined && room.roomOwnerId !== null
      ? room.roomOwnerId === currentUserId
      : false;

  const table = (room.game?.table ?? []) as TableEntry[];
  const currentEntry = currentUserId
    ? table.find((t) => (t.userId ?? t.user?.id ?? null) === currentUserId)
    : undefined;
  const hasSelectedOwnCard = Boolean(currentEntry?.card);
  const selectedCardLabel = currentEntry?.card ?? "";

  // ===== Countdown Overlay state =====
  const [showCountdownOverlay, setShowCountdownOverlay] = useState(false);
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);

  // Debug watcher
  useEffect(() => {
    console.log(
      "[Countdown debug]",
      "enabled:",
      room.countdownEnabled,
      "stage:",
      room.revealStage,
      "value:",
      room.countdownValue
    );
  }, [room.countdownEnabled, room.revealStage, room.countdownValue]);

  // ===== Final tuned local-only countdown logic =====
  const revealStageRef = useRef(room.revealStage);
  useEffect(() => {
    revealStageRef.current = room.revealStage;
  }, [room.revealStage]);

  useEffect(() => {
    if (
      !showCountdownOverlay &&
      room.countdownEnabled &&
      room.revealStage?.toUpperCase() === "COUNTDOWN" &&
      room.countdownValue === 3
    ) {
      setShowCountdownOverlay(true);
      setLocalCountdown(3);

      let current = 3;
      let cancelled = false;

      const tick = () => {
        // Always read the most recent stage
        if (revealStageRef.current?.toUpperCase() === "CANCELLED") {
          cancelled = true;
          setShowCountdownOverlay(false);
          setLocalCountdown(null);
          return;
        }

        current -= 1;

        if (current >= 1) {
          setLocalCountdown(current);
          setTimeout(tick, 1000);
        } else {
          // fade a bit sooner after 1 appears
          setTimeout(() => {
            if (!cancelled) {
              setShowCountdownOverlay(false);
              setLocalCountdown(null);
            }
          }, 0);
        }
      };

      setTimeout(tick, 1000);
    }
  }, [
    room.countdownEnabled,
    room.countdownValue,
    room.revealStage,
    showCountdownOverlay
  ]);

  // ===== Handlers =====
  async function handleReveal() {
    if (!currentIsRoomOwner) {
      toast({
        title: "Not allowed",
        description: "Only the room owner can reveal cards.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (room.countdownEnabled) {
        await startRevealCountdown({
          variables: { roomId: room.id, userId: currentUserId }
        });
      } else {
        await showCardsMutation({
          variables: { roomId: room.id }
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reveal cards.",
        variant: "destructive"
      });
    }
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

  // ===== Render =====
  return (
    <div
      ref={innerRef}
      className="flex justify-center items-center w-[25vw] max-w-72 min-w-48 h-36 rounded-full border-2 border-s-4 border-e-4 border-gray-500"
    >
      {isCardsPicked ? (
        isGameOver ? (
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
          <Button
            onClick={handleReveal}
            disabled={showCardLoading || countdownLoading}
            size="lg"
          >
            {(showCardLoading || countdownLoading) && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reveal Cards
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
              Waiting to reveal cards...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <span className="text-sm text-muted-foreground">
              Select card to vote
            </span>
            <span className="text-xs text-accent mt-1">
              Waiting to reveal cards...
            </span>
          </div>
        )
      ) : hasSelectedOwnCard && !currentIsRoomOwner ? (
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
      {showCountdownOverlay && localCountdown !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 pointer-events-auto">
          <CountdownOverlay
            seconds={localCountdown}
            isRoomOwner={currentIsRoomOwner}
            onCancel={() =>
              cancelRevealCountdownMutation({
                variables: { roomId: room.id, userId: currentUserId }
              })
            }
          />
        </div>
      )}
    </div>
  );
};
