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

  const totalPlayers = room.users?.length ?? 0;
  const voteCount = table.length;
  const userHasSubmitted = currentEntry !== undefined;
  const selectedCardLabel = currentEntry?.card ?? "";
  const votePercentage =
    totalPlayers > 0
      ? Math.round((voteCount / totalPlayers) * 100)
      : 0;

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

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    let frame: number;

    const animate = () => {
      setAnimatedProgress(prev => {
        const diff = votePercentage - prev;

        if (Math.abs(diff) < 0.5) {
          return votePercentage;
        }

        return prev + diff * 0.1;
      });

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [votePercentage]);

  // ===== Render =====
  return (
    <div
      ref={innerRef}
      className="
        relative flex justify-center items-center
        w-[25vw] max-w-72 min-w-48
        h-36 rounded-full
        isolate
      "
    >
      {/* Accent Glow Halo */}
      <div
        className="absolute inset-0 rounded-full blur-md pointer-events-none"
        style={{
          boxShadow: `0 0 30px 8px hsl(var(--accent) / 0.35)`,
          background: `
            radial-gradient(
              circle at 50% 50%,
              hsl(var(--accent) / 0.25) 0%,
              transparent 65%
            )
          `,
        }}
      >
        <div className="absolute inset-0 rounded-full border border-white/20 dark:border-white/10" />
      </div>

      {/* Progress Accent */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none p-[15px]"
        style={{
          background: `
            conic-gradient(
              hsl(var(--accent)) ${animatedProgress * 3.6}deg,
              transparent 0deg
            )
          `,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude"
        }}
      />

      {/* Glass Surface */}
      <div
        className={[
          "relative w-full h-full rounded-full",
          "backdrop-blur-[3px] shadow-[inset_0_0_12px_rgba(0,0,0,0.35),inset_0_0_40px_rgba(0,0,0,0.15)]",
          "border border-white/10 flex items-center justify-center"
        ].join(" ")}
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
                  className="w-[60%] h-[35%]"
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
                  <span className="text-[clamp(10px,1.5vw,16px)]font-semibold">
                    You voted:{" "}
                    <span className="ml-1 font-mono tabular-nums">
                      {selectedCardLabel}
                    </span>
                  </span>
                    <span className="text-[clamp(9px,1vw,12px)] text-accent mt-1">
                    Waiting to start new game...
                  </span>
                </div>
              );
            } else {
              return (
                <div className="flex flex-col items-center text-center">
                  <span className="text-[clamp(10px,1.5vw,16px)]">You did not select vote</span>
                  <span className="text-[clamp(9px,1vw,12px)] text-accent mt-1">
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
                  className="flex flex-col items-center justify-center w-[65%] h-[40%] text-base"
                >
                  <span className="font-semibold text-[clamp(10px,1.4vw,18px)] mt-2">
                    Reveal Votes
                  </span>

                  <span className="text-[clamp(8px,0.6vw,11px)] font-mono opacity-60 -mt-1.5">
                    {voteCount}/{totalPlayers} voted ({votePercentage}%)
                  </span>
                </Button>

              );
            } else {
              return (
                <div className="flex flex-col items-center text-center">
                <span className="text-[clamp(10px,1.5vw,16px)] text-muted-foreground">
                  No votes yet
                </span>
                  <span className="text-[clamp(9px,1vw,12px)] text-accent mt-1">
                  Waiting for players to vote...
                </span>
                </div>
              );
            }
          } else {
            if (userHasSubmitted) {
              return (
                <div className="flex flex-col items-center text-center">
                <span className="text-[clamp(10px,1.5vw,16px)] font-semibold text-accent">
                  Waiting to reveal cards...
                </span>
                <span className="text-[clamp(9px,1vw,12px)] mt-1">
                  The owner will reveal when ready
                </span>
                </div>
              );
            } else {
              return (
                <div className="flex flex-col items-center text-center">
                <span className="text-[clamp(10px,1.5vw,16px)]">
                  Select card to vote
                </span>
                {voteCount > 0 && (
                  <span className="text-[clamp(9px,1vw,12px)] text-accent mt-1">
                    Waiting to reveal cards...
                  </span>
                )}
                </div>
              );
            }
          }
        })()}
      </div>

      {showCountdownOverlay && localCountdown !== null && roomOverlayRef && roomOverlayRef.current &&
        createPortal(
          <div
            className="absolute left-0 right-0 z-50 pointer-events-none"
            style={{
              top: 0,
              height: roomOverlayRef.current.clientHeight
            }}
          >
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
