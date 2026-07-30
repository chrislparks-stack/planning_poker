import { ReloadIcon } from "@radix-ui/react-icons";
import { Eye, EyeOff, Pencil, RefreshCcw } from "lucide-react";
import {
  ButtonHTMLAttributes,
  FC,
  RefObject,
  useEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

import {
  useCancelRevealCountdownMutation,
  useResetGameMutation,
  useSetCurrentIssueTitleMutation,
  useSetVoteUncensoredMutation,
  useShowCardsMutation,
  useStartNextQueueItemMutation,
  useStartRevealCountdownMutation,
  useStartRevoteMutation
} from "@/api";
import bumperTexture from "@/assets/table-bumper-texture.webp";
import feltTexture from "@/assets/table-felt-texture.webp";
import { NewGameDialog } from "@/components/NewGameDialog";
import { Button } from "@/components/ui/button";
import { CountdownOverlay } from "@/components/ui/countdown-overlay.tsx";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getVoteMetrics } from "@/lib/vote-metrics";
import { getCurrentVoteTitle } from "@/lib/vote-round";
import type { Room } from "@/types";

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
  const [editingIssue, setEditingIssue] = useState(false);
  const [issueDraft, setIssueDraft] = useState(
    room.currentIssueTitle?.trim() ?? ""
  );

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
  const [startRevoteMutation, { loading: startRevoteLoading }] =
    useStartRevoteMutation({
      onError: (error) => {
        toast({
          title: "Unable to start revote",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  const [startNextQueueItem, { loading: startNextQueueLoading }] =
    useStartNextQueueItemMutation({
      onError: (error) => {
        toast({
          title: "Unable to start the next issue",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  const [setCurrentIssueTitle, { loading: issueTitleLoading }] =
    useSetCurrentIssueTitleMutation({
      onError: (error) => {
        toast({
          title: "Unable to update the issue",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  const [setVoteUncensored, { loading: voteVisibilityLoading }] =
    useSetVoteUncensoredMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Vote visibility: ${error.message}`,
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
    room.roomOwnerId != null && room.roomOwnerId === currentUserId;
  const table = (room.game?.table ?? []) as TableEntry[];
  const currentEntry = currentUserId
    ? table.find(
        (entry) => (entry.userId ?? entry.user?.id ?? null) === currentUserId
      )
    : undefined;
  const currentUser = currentUserId
    ? room.users.find((candidate) => candidate.id === currentUserId)
    : undefined;
  const totalPlayers = room.users.length;
  const voteCount = table.length;
  const userHasSelected = currentEntry !== undefined;
  const selectedCardLabel = currentEntry?.card ?? "";
  const votePercentage =
    totalPlayers > 0 ? Math.round((voteCount / totalPlayers) * 100) : 0;
  const currentVoteUncensored = currentUser?.voteUncensored ?? false;
  const isRevote = room.previousRound != null;
  const hasQueuedIssue = room.voteQueue.length > 0;
  const currentVoteTitle = getCurrentVoteTitle(room);
  const resultMetrics = getVoteMetrics(
    room.game.table.map((vote) => ({
      card: vote.card,
      value: room.users.find((candidate) => candidate.id === vote.userId)
        ?.lastCardValue
    }))
  );

  useEffect(() => {
    if (!editingIssue) {
      setIssueDraft(room.currentIssueTitle?.trim() ?? "");
    }
  }, [editingIssue, room.currentIssueTitle]);

  const [showCountdownOverlay, setShowCountdownOverlay] = useState(false);
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);
  const revealStageRef = useRef(room.revealStage);

  useEffect(() => {
    revealStageRef.current = room.revealStage;
  }, [room.revealStage]);

  useEffect(() => {
    if (
      showCountdownOverlay ||
      !room.countdownEnabled ||
      room.revealStage?.toUpperCase() !== "COUNTDOWN" ||
      room.countdownValue !== 3
    ) {
      return;
    }

    setShowCountdownOverlay(true);
    setLocalCountdown(3);
    let current = 3;
    let cancelled = false;

    const tick = () => {
      if (revealStageRef.current?.toUpperCase() === "CANCELLED") {
        cancelled = true;
        setShowCountdownOverlay(false);
        setLocalCountdown(null);
        return;
      }

      current -= 1;
      if (current >= 1) {
        setLocalCountdown(current);
        window.setTimeout(tick, 1000);
      } else {
        window.setTimeout(() => {
          if (!cancelled) {
            setShowCountdownOverlay(false);
            setLocalCountdown(null);
          }
        }, 0);
      }
    };

    window.setTimeout(tick, 1000);
  }, [
    room.countdownEnabled,
    room.countdownValue,
    room.revealStage,
    showCountdownOverlay
  ]);

  async function handleReveal() {
    if (!currentIsRoomOwner) return;

    if (room.countdownEnabled) {
      await startRevealCountdown({
        variables: { roomId: room.id, userId: currentUserId }
      });
      return;
    }
    await showCardsMutation({ variables: { roomId: room.id } });
  }

  async function handleVoteVisibility() {
    if (!currentUserId) return;
    await setVoteUncensored({
      variables: {
        roomId: room.id,
        userId: currentUserId,
        uncensored: !currentVoteUncensored
      }
    });
  }

  function handleResetGame() {
    if (!currentIsRoomOwner) return;

    resetGameMutation({ variables: { roomId: room.id } })
      .catch(() => undefined)
      .finally(() => setOpenNewGameDialog(false));
  }

  async function handleStartRevote() {
    if (!currentIsRoomOwner || !currentUserId) return;
    await startRevoteMutation({
      variables: { roomId: room.id, userId: currentUserId }
    });
  }

  async function handleStartNextQueueItem() {
    if (!currentIsRoomOwner || !currentUserId) return;
    await startNextQueueItem({
      variables: { roomId: room.id, userId: currentUserId }
    });
  }

  async function handleIssueTitleSave() {
    if (!currentIsRoomOwner || !currentUserId) return;
    const title = issueDraft.trim();

    if (title === (room.currentIssueTitle?.trim() ?? "")) {
      setEditingIssue(false);
      return;
    }

    await setCurrentIssueTitle({
      variables: {
        roomId: room.id,
        userId: currentUserId,
        title: title || null
      }
    });
    setEditingIssue(false);
  }

  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setAnimatedProgress((previous) => {
        const difference = votePercentage - previous;
        return Math.abs(difference) < 0.5
          ? votePercentage
          : previous + difference * 0.1;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [votePercentage]);

  const voteVisibilityButton =
    room.censorVotes && userHasSelected ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={voteVisibilityLoading}
        onClick={() => void handleVoteVisibility()}
        className="h-7 gap-1.5 border-accent/55 bg-accent/15 px-2.5 text-[0.58rem] font-semibold text-foreground shadow-[0_0_10px_hsl(var(--accent)/0.18)] hover:bg-accent/25 hover:text-foreground"
      >
        {currentVoteUncensored ? (
          <EyeOff aria-hidden="true" className="size-3" />
        ) : (
          <Eye aria-hidden="true" className="size-3" />
        )}
        {currentVoteUncensored ? "Hide my vote" : "Show my vote"}
      </Button>
    ) : null;

  const saveIssue = () => {
    void handleIssueTitleSave().catch(() => undefined);
  };

  return (
    <div
      ref={innerRef}
      className="poker-table-shell relative isolate flex h-[clamp(146px,14vw,204px)] w-[clamp(320px,34vw,480px)] items-center justify-center rounded-[999px]"
    >
      <div
        className="pointer-events-none absolute inset-1 rounded-[inherit] blur-xl"
        style={{
          boxShadow: `0 10px 26px rgba(0, 0, 0, 0.52), 0 0 ${
            12 + animatedProgress / 4
          }px ${Math.max(1, animatedProgress / 22)}px hsl(var(--accent) / ${
            0.12 + animatedProgress / 360
          })`
        }}
      />
      <div
        className="poker-table-rail absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{
          background: `conic-gradient(
            from -90deg,
            hsl(var(--accent)) 0deg,
            hsl(var(--accent)) ${animatedProgress * 3.6}deg,
            var(--table-rail-rest) ${animatedProgress * 3.6}deg,
            var(--table-rail-rest) 360deg
          )`
        }}
      >
        <div
          className="poker-table-bumper-texture pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ backgroundImage: `url(${bumperTexture})` }}
        />
        <div className="poker-table-bumper-sculpt pointer-events-none absolute inset-0 rounded-[inherit]" />
        <div className="poker-table-felt-layer poker-table-felt-backing pointer-events-none absolute rounded-[inherit]" />
        <div className="poker-table-felt-layer poker-table-felt absolute overflow-hidden rounded-[inherit]">
          <div className="poker-table-felt-light pointer-events-none absolute inset-0 rounded-[inherit]" />
          <div
            className="poker-table-felt-texture pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ backgroundImage: `url(${feltTexture})` }}
          />
          <div className="poker-table-content relative flex h-full flex-col">
            {isGameOver ? (
              <>
                <div className="poker-table-result-grid grid min-h-0 flex-1 grid-cols-[1.2fr_0.8fr] items-center divide-x divide-border/55">
                  <div className="min-w-0 pr-[clamp(0.5rem,3.3cqw,1rem)]">
                    <p className="poker-table-eyebrow font-bold uppercase text-accent/85">
                      On the table
                    </p>
                    <IssueTitle
                      title={room.currentIssueTitle}
                      fallbackTitle={currentVoteTitle}
                      queued={room.currentQueueItemId != null}
                      canEdit={currentIsRoomOwner}
                      editing={editingIssue}
                      draft={issueDraft}
                      loading={issueTitleLoading}
                      onDraftChange={setIssueDraft}
                      onEdit={() => setEditingIssue(true)}
                      onCancel={() => {
                        setIssueDraft(room.currentIssueTitle?.trim() ?? "");
                        setEditingIssue(false);
                      }}
                      onSave={saveIssue}
                    />
                  </div>
                  <StoryPointsResult
                    points={resultMetrics.majorityCard}
                    votes={resultMetrics.voteCount}
                    agreement={resultMetrics.agreement}
                  />
                </div>

                <div className="border-t border-border/50 pt-[clamp(0.2rem,1.25cqw,0.375rem)]">
                  {currentIsRoomOwner ? (
                    <OwnerPostActions
                      lockVotes={room.lockVotes}
                      hasQueuedIssue={hasQueuedIssue}
                      loading={
                        resetGameLoading ||
                        startRevoteLoading ||
                        startNextQueueLoading
                      }
                      onNewGame={() =>
                        room.confirmNewGame
                          ? setOpenNewGameDialog(true)
                          : handleResetGame()
                      }
                      onRevote={() =>
                        void handleStartRevote().catch(() => undefined)
                      }
                      onNext={() =>
                        void handleStartNextQueueItem().catch(() => undefined)
                      }
                    />
                  ) : (
                    <div className="flex min-h-8 flex-col items-center justify-center text-center">
                      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                        {userHasSelected
                          ? `You voted ${selectedCardLabel}`
                          : "No vote selected"}
                      </span>
                      <span className="mt-0.5 text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-accent">
                        Round complete
                      </span>
                    </div>
                  )}
                  {voteVisibilityButton && (
                    <div className="mt-1 flex justify-center">
                      {voteVisibilityButton}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="poker-table-open-main mx-auto flex min-h-0 flex-1 flex-col justify-center border-b border-border/50 px-1 pb-1">
                  <p className="poker-table-eyebrow font-bold uppercase text-accent/85">
                    On the table
                  </p>
                  <IssueTitle
                    title={room.currentIssueTitle}
                    fallbackTitle={currentVoteTitle}
                    queued={room.currentQueueItemId != null}
                    canEdit={currentIsRoomOwner}
                    editing={editingIssue}
                    draft={issueDraft}
                    loading={issueTitleLoading}
                    onDraftChange={setIssueDraft}
                    onEdit={() => setEditingIssue(true)}
                    onCancel={() => {
                      setIssueDraft(room.currentIssueTitle?.trim() ?? "");
                      setEditingIssue(false);
                    }}
                    onSave={saveIssue}
                  />
                </div>
                <div className="poker-table-open-controls mx-auto grid grid-cols-[0.72fr_1px_1.12fr] items-center pt-1">
                  {currentIsRoomOwner ? (
                    <Button
                      type="button"
                      onClick={() => void handleReveal().catch(() => undefined)}
                      disabled={
                        voteCount === 0 || showCardLoading || countdownLoading
                      }
                      className="poker-table-primary-action min-w-0 rounded-full px-[clamp(0.5rem,2.5cqw,0.75rem)] font-semibold"
                    >
                      {showCardLoading || countdownLoading ? (
                        <ReloadIcon className="mr-1 size-3 animate-spin" />
                      ) : null}
                      {isRevote ? "Reveal Revote" : "Reveal Votes"}
                    </Button>
                  ) : (
                    <span className="truncate text-center text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                      {userHasSelected
                        ? `Vote selected · ${selectedCardLabel}`
                        : "Select a card below"}
                    </span>
                  )}
                  <span
                    className="h-[clamp(1.15rem,5cqw,1.5rem)] w-px bg-border/70"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 text-center">
                    <span className="poker-table-status block font-bold uppercase text-accent">
                      Voting open
                    </span>
                    <span className="poker-table-status-detail block uppercase text-muted-foreground">
                      {voteCount} of {totalPlayers} selected
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showCountdownOverlay &&
        localCountdown !== null &&
        roomOverlayRef?.current &&
        createPortal(
          <div
            className="pointer-events-none absolute left-0 right-0 z-50"
            style={{
              top: 0,
              height: roomOverlayRef.current.clientHeight
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.45)_20%,rgba(0,0,0,0.2)_50%,transparent_100%)]" />
            <div className="pointer-events-auto relative z-10 flex h-full w-full items-center justify-center">
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
          </div>,
          roomOverlayRef.current
        )}

      <NewGameDialog
        open={openNewGameDialog}
        setOpen={setOpenNewGameDialog}
        room={room}
        onConfirm={handleResetGame}
      />
    </div>
  );
};

function IssueTitle({
  title,
  fallbackTitle,
  queued,
  canEdit,
  editing,
  draft,
  loading,
  onDraftChange,
  onEdit,
  onCancel,
  onSave
}: {
  title?: string | null;
  fallbackTitle: string;
  queued: boolean;
  canEdit: boolean;
  editing: boolean;
  draft: string;
  loading: boolean;
  onDraftChange: (value: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChanges = draft.trim() !== (title?.trim() ?? "");

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing && canEdit) {
    return (
      <div className="mt-0.5 w-full">
        <input
          ref={inputRef}
          maxLength={140}
          value={draft}
          disabled={loading}
          onChange={(event) => onDraftChange(event.target.value)}
          onBlur={onSave}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSave();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          aria-label="Issue title"
          aria-describedby={hasChanges ? "issue-title-help" : undefined}
          placeholder="Add an issue title"
          className="poker-table-title h-[clamp(1.4rem,6.5cqw,1.75rem)] w-full border-b border-accent/75 bg-transparent font-medium outline-none placeholder:text-muted-foreground/70 focus:border-accent"
        />
        {hasChanges && (
          <p
            id="issue-title-help"
            className="mt-1 text-[0.52rem] font-medium tracking-[0.04em] text-muted-foreground"
          >
            Enter to save · Esc to cancel
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={onEdit}
      className={cn(
        "poker-table-title mt-[clamp(0.15rem,1cqw,0.25rem)] flex w-full max-w-full items-center gap-[clamp(0.3rem,1.6cqw,0.5rem)] text-left font-medium",
        canEdit &&
          "rounded-sm outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/45"
      )}
    >
      <span className="truncate">{title?.trim() || fallbackTitle}</span>
      {queued && (
        <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[0.48rem] font-bold uppercase tracking-[0.12em] text-accent/80">
          Queued
        </span>
      )}
      {canEdit && (
        <Pencil
          className="ml-auto size-3 shrink-0 text-accent/75"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function StoryPointsResult({
  points,
  votes,
  agreement
}: {
  points: string | null;
  votes: number;
  agreement: number;
}) {
  const agreementWidth = Math.max(0, Math.min(100, agreement));

  return (
    <div className="flex min-w-0 flex-col items-center justify-center pl-[clamp(0.5rem,3.3cqw,1rem)] text-center">
      <span className="poker-table-story-label font-bold uppercase text-accent/85">
        Story points
      </span>
      <strong
        className={cn(
          "poker-table-story-points mt-0.5 whitespace-nowrap font-mono leading-none text-foreground [text-shadow:0_0_7px_rgba(var(--accent-rgb),0.58)]",
          points?.includes("|") && "text-[0.8em]"
        )}
      >
        {points ?? "—"}
      </strong>
      <span
        role="progressbar"
        aria-label="Agreement"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(agreementWidth)}
        className="poker-table-agreement mt-[clamp(0.15rem,1cqw,0.25rem)] overflow-hidden rounded-full border border-accent/25 bg-accent/10 p-px shadow-[inset_0_0_3px_rgba(0,0,0,0.65)]"
      >
        <span
          className="block h-full rounded-full bg-accent shadow-[0_0_6px_rgba(var(--accent-rgb),0.62)] transition-[width] duration-500"
          style={{ width: `${agreementWidth}%` }}
        />
      </span>
      <span className="poker-table-result-detail mt-[clamp(0.15rem,1cqw,0.25rem)] truncate text-muted-foreground">
        {votes} vote{votes === 1 ? "" : "s"} · {agreement.toFixed(0)}% agree
      </span>
    </div>
  );
}

function OwnerPostActions({
  lockVotes,
  hasQueuedIssue,
  loading,
  onNewGame,
  onRevote,
  onNext
}: {
  lockVotes: boolean;
  hasQueuedIssue: boolean;
  loading: boolean;
  onNewGame: () => void;
  onRevote: () => void;
  onNext: () => void;
}) {
  const columns =
    lockVotes && hasQueuedIssue ? 3 : hasQueuedIssue || lockVotes ? 2 : 1;

  return (
    <div
      className="poker-table-actions grid overflow-hidden rounded-full border border-accent/55 shadow-[0_0_12px_rgba(var(--accent-rgb),0.16)]"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      <PostActionButton
        onClick={onNewGame}
        disabled={loading}
        className="bg-accent text-accent-foreground hover:bg-accent-hover"
      >
        {loading && <ReloadIcon className="mr-1 size-3 animate-spin" />}
        Start New Game
      </PostActionButton>
      {lockVotes && (
        <PostActionButton
          onClick={onRevote}
          disabled={loading}
          className="border-l border-white/15 bg-[hsl(calc(var(--accent-hue)-10)_68%_45%)] text-white hover:brightness-110"
        >
          <RefreshCcw className="mr-1 size-3" aria-hidden="true" />
          Revote Issue
        </PostActionButton>
      )}
      {hasQueuedIssue && (
        <PostActionButton
          onClick={onNext}
          disabled={loading}
          className="border-l border-white/15 bg-[hsl(calc(var(--accent-hue)+12)_68%_48%)] text-white hover:brightness-110"
        >
          Next Queue Item
        </PostActionButton>
      )}
    </div>
  );
}

function PostActionButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 items-center justify-center truncate px-2 text-[clamp(0.48rem,0.65vw,0.62rem)] font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
