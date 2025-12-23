import { ReloadIcon } from "@radix-ui/react-icons";
import {FC, RefObject, useEffect, useRef, useState} from "react";
import {
  useCancelRevealCountdownMutation,
  useResetGameMutation,
  useShowCardsMutation,
  useStartRevealCountdownMutation,
} from "@/api";
import { Button } from "@/components/ui/button";
import { CountdownOverlay } from "@/components/ui/countdown-overlay.tsx";
import { useToast } from "@/hooks/use-toast";
import type { Room } from "@/types";
import { NewGameDialog } from "@/components/NewGameDialog";
import {createPortal} from "react-dom";

interface TableProps {
  room: Room;
  isGameOver: boolean;
  innerRef: RefObject<HTMLDivElement | null>;
  roomOverlayRef: RefObject<HTMLDivElement | null> | null;
}

type TableEntry = {
  userId?: string | null;
  user?: { id?: string | null } | null;
  card?: string | null;
};

export const Table: FC<TableProps> = ({
  room,
  isGameOver,
  innerRef,
  roomOverlayRef
}) => {
  const { toast } = useToast();
  const [openNewGameDialog, setOpenNewGameDialog] = useState(false);

  const [showCardsMutation, { loading: showCardLoading }] =
    useShowCardsMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Show cards: ${error.message}`,
          variant: "destructive",
        });
      },
    });

  const [resetGameMutation, { loading: resetGameLoading }] =
    useResetGameMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Reset game: ${error.message}`,
          variant: "destructive",
        });
      },
    });

  const [startRevealCountdown, { loading: countdownLoading }] =
    useStartRevealCountdownMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Countdown: ${error.message}`,
          variant: "destructive",
        });
      },
    });

  const [cancelRevealCountdownMutation] =
    useCancelRevealCountdownMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Cancel countdown: ${error.message}`,
          variant: "destructive",
        });
      },
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
    room.roomOwnerId !== undefined &&
    room.roomOwnerId !== null &&
    room.roomOwnerId === currentUserId;

  const table = (room.game?.table ?? []) as TableEntry[];

  // entry for THIS user
  const currentEntry = currentUserId
    ? table.find(
      (t) =>
        (t.userId ?? t.user?.id ?? null) === currentUserId
    )
    : undefined;

  const voteCount = table.length;
  const userHasSubmitted = currentEntry !== undefined;
  const selectedCardLabel = currentEntry?.card ?? "";

  // ===== Countdown Overlay state =====
  const [showCountdownOverlay, setShowCountdownOverlay] =
    useState(false);
  const [localCountdown, setLocalCountdown] = useState<
    number | null
  >(null);

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
        if (
          revealStageRef.current?.toUpperCase() === "CANCELLED"
        ) {
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
    showCountdownOverlay,
  ]);

  // ===== Handlers =====
  async function handleReveal() {
    if (!currentIsRoomOwner) {
      toast({
        title: "Not allowed",
        description: "Only the room owner can reveal cards.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (room.countdownEnabled) {
        await startRevealCountdown({
          variables: { roomId: room.id, userId: currentUserId },
        });
      } else {
        await showCardsMutation({
          variables: { roomId: room.id },
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message || "Failed to reveal cards.",
        variant: "destructive",
      });
    }
  }

  function handleResetGame() {
    if (!currentIsRoomOwner) {
      toast({
        title: "Not allowed",
        description:
          "Only the room owner can start a new game.",
        variant: "destructive",
      });
      return;
    }

    resetGameMutation({ variables: { roomId: room.id } })
      .catch((err) => {
        console.error("Failed to reset game:", err);
        toast({
          title: "Error",
          description:
            "Failed to reset game. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setOpenNewGameDialog(false);
      });
  }

  // ===== Render =====
  return (
    <div
      ref={innerRef}
      className="relative flex justify-center items-center w-[25vw] max-w-72 min-w-48 h-36 rounded-full border-2 border-s-4 border-e-4 border-gray-500"
    >
      {(() => {
        // === ROUND OVER ===
        if (isGameOver) {
          if (currentIsRoomOwner) {
            return (
              <Button
                onClick={() =>
                  room.confirmNewGame
                    ? setOpenNewGameDialog(true)
                    : handleResetGame()
                }
                disabled={resetGameLoading}
                className="w-36"
                size="lg"
              >
                {resetGameLoading && (
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start New Game
              </Button>
            );
          } else if (userHasSubmitted) {
            return (
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
            );
          } else {
            return (
              <div className="flex flex-col items-center text-center">
                <span className="text-sm text-muted-foreground">No vote yet</span>
                <span className="text-xs text-accent mt-1">
                Waiting to start new game...
              </span>
              </div>
            );
          }
        }

        // === ROUND IN PROGRESS ===
        if (currentIsRoomOwner) {
          if (voteCount > 0) {
            return (
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
            );
          } else {
            return (
              <div className="flex flex-col items-center text-center">
              <span className="text-sm text-muted-foreground">
                No votes yet
              </span>
                <span className="text-xs text-accent mt-1">
                Waiting for players to vote...
              </span>
              </div>
            );
          }
        } else {
          if (userHasSubmitted) {
            return (
              <div className="flex flex-col items-center text-center">
              <span className="text-sm font-semibold text-accent">
                Waiting to reveal cards...
              </span>
                <span className="text-xs text-muted-foreground mt-1">
                The owner will reveal when ready.
              </span>
              </div>
            );
          } else {
            return (
              <div className="flex flex-col items-center text-center">
              <span className="text-sm text-muted-foreground">
                Select card to vote
              </span>
                {voteCount > 0 && (
                  <span className="text-xs text-accent mt-1">
                  Waiting to reveal cards...
                </span>
                )}
              </div>
            );
          }
        }
      })()}

      {showCountdownOverlay && localCountdown !== null && roomOverlayRef && roomOverlayRef.current &&
        createPortal(
          <div className="absolute inset-0 z-50 pointer-events-none">
            {/* Backdrop */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 20%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)",
              }}
            />
            {/* Countdown */}
            <div className="relative z-10 flex h-full w-full items-center justify-center pointer-events-auto">
              <CountdownOverlay
                seconds={localCountdown}
                isRoomOwner={currentIsRoomOwner}
                onCancel={() =>
                  cancelRevealCountdownMutation({
                    variables: { roomId: room.id, userId: currentUserId },
                  })
                }
              />
            </div>
          </div>,
          roomOverlayRef.current
        )
      }

      <NewGameDialog
        open={openNewGameDialog}
        setOpen={setOpenNewGameDialog}
        room={room}
        onConfirm={handleResetGame}
      />
    </div>
  );
};
