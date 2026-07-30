import { Reorder } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
  Undo2,
  UserRound,
  UsersRound
} from "lucide-react";
import {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useMemo,
  useEffect,
  useRef,
  useState
} from "react";

import {
  useAddVoteQueueItemMutation,
  useRemoveVoteQueueItemMutation,
  useRenameVoteQueueItemMutation,
  useReorderVoteQueueItemMutation,
  useReturnCurrentVoteQueueItemMutation,
  useStartVoteQueueItemMutation
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getVoteMetrics } from "@/lib/vote-metrics";
import { getCurrentVoteTitle } from "@/lib/vote-round";
import type {
  ArchivedPlayerVote,
  Room,
  RoundVoteHistory,
  VoteQueueItem
} from "@/types";

interface VoteSessionPanelProps {
  room: Room;
}

const issueFallback = (roundNumber?: number) =>
  roundNumber ? `Round ${roundNumber}` : "Quick vote";

const PANEL_OPEN_STORAGE_KEY = "vote-session-panel-open";
const PANEL_WIDTH_STORAGE_KEY = "vote-session-panel-width";
const DEFAULT_PANEL_WIDTH = 420;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 560;

const clampPanelWidth = (width: number) =>
  Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));

const getStoredPanelOpen = () => {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(PANEL_OPEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const getStoredPanelWidth = () => {
  if (typeof window === "undefined") return DEFAULT_PANEL_WIDTH;

  try {
    const storedWidth = Number(
      window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY)
    );
    return Number.isFinite(storedWidth) && storedWidth > 0
      ? clampPanelWidth(storedWidth)
      : DEFAULT_PANEL_WIDTH;
  } catch {
    return DEFAULT_PANEL_WIDTH;
  }
};

const storePanelPreference = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the panel usable when storage is unavailable.
  }
};

const formatCompletedAt = (completedAt: string) => {
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) return completedAt;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  }).format(completedDate);
};

export function VoteSessionPanel({ room }: VoteSessionPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(getStoredPanelOpen);
  const [panelWidth, setPanelWidth] = useState(getStoredPanelWidth);
  const [resizing, setResizing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState(room.voteQueue);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const queueItemsRef = useRef(room.voteQueue);
  const panelRef = useRef<HTMLElement>(null);
  const resizeStartRef = useRef<{ clientX: number; width: number } | null>(
    null
  );
  const pendingPanelWidthRef = useRef(panelWidth);
  const resizeFrameRef = useRef<number | null>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) newItemInputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (editingId) renameInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (!draggedItemId && !reordering) {
      queueItemsRef.current = room.voteQueue;
      setQueueItems(room.voteQueue);
    }
  }, [draggedItemId, reordering, room.voteQueue]);

  useEffect(
    () => () => {
      if (resizeFrameRef.current != null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const panel = panelRef.current;
    const layout = panel?.parentElement;
    if (!panel || !layout) return;

    const syncOverlayWidth = () => {
      layout.style.setProperty(
        "--vote-session-panel-overlay-width",
        `${panel.getBoundingClientRect().width}px`
      );
    };

    syncOverlayWidth();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(syncOverlayWidth);
    observer?.observe(panel);
    window.addEventListener("resize", syncOverlayWidth);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncOverlayWidth);
      layout.style.removeProperty("--vote-session-panel-overlay-width");
    };
  }, []);

  const currentUserId = user?.id;
  const isOwner = currentUserId != null && currentUserId === room.roomOwnerId;
  const currentMetrics = useMemo(
    () =>
      getVoteMetrics(
        room.game.table.map((vote) => ({
          card: vote.card,
          value: room.users.find((candidate) => candidate.id === vote.userId)
            ?.lastCardValue
        }))
      ),
    [room.game.table, room.users]
  );
  const completedCount = room.voteHistory.length + (room.isGameOver ? 1 : 0);
  const currentTitle = getCurrentVoteTitle(room);

  const [addQueueItem, { loading: addLoading }] = useAddVoteQueueItemMutation();
  const [renameQueueItem] = useRenameVoteQueueItemMutation();
  const [removeQueueItem] = useRemoveVoteQueueItemMutation();
  const [reorderQueueItem] = useReorderVoteQueueItemMutation();
  const [startVoteQueueItem] = useStartVoteQueueItemMutation();
  const [returnCurrentVoteQueueItem, { loading: returningCurrentItem }] =
    useReturnCurrentVoteQueueItemMutation();

  const setPanelOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    storePanelPreference(PANEL_OPEN_STORAGE_KEY, String(nextOpen));
  };

  const resizePanel = (nextWidth: number) => {
    const clampedWidth = clampPanelWidth(nextWidth);
    pendingPanelWidthRef.current = clampedWidth;
    panelRef.current?.style.setProperty(
      "--vote-session-panel-width",
      `${clampedWidth}px`
    );
    setPanelWidth(clampedWidth);
    storePanelPreference(PANEL_WIDTH_STORAGE_KEY, String(clampedWidth));
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!open || !Number.isFinite(event.clientX)) return;

    resizeStartRef.current = {
      clientX: event.clientX,
      width: panelWidth
    };
    pendingPanelWidthRef.current = panelWidth;
    panelRef.current?.style.setProperty("transition", "none");
    panelRef.current?.style.setProperty("will-change", "width, min-width");
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setResizing(true);
  };

  const handleResizeMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeStart = resizeStartRef.current;
    if (!resizeStart || !Number.isFinite(event.clientX)) return;

    pendingPanelWidthRef.current = clampPanelWidth(
      resizeStart.width + event.clientX - resizeStart.clientX
    );

    if (resizeFrameRef.current != null) return;

    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      panelRef.current?.style.setProperty(
        "--vote-session-panel-width",
        `${pendingPanelWidthRef.current}px`
      );
    });
  };

  const handleResizeEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (resizeFrameRef.current != null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }

    const nextWidth = pendingPanelWidthRef.current;
    panelRef.current?.style.setProperty(
      "--vote-session-panel-width",
      `${nextWidth}px`
    );
    panelRef.current?.style.removeProperty("transition");
    panelRef.current?.style.removeProperty("will-change");
    setPanelWidth(nextWidth);
    storePanelPreference(PANEL_WIDTH_STORAGE_KEY, String(nextWidth));
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizing(false);
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    resizePanel(panelWidth + (event.key === "ArrowRight" ? 16 : -16));
  };

  const mutationError = (title: string, error: unknown) => {
    toast({
      title,
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive"
    });
  };

  const submitNewItem = async (event: FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || !currentUserId) return;

    try {
      await addQueueItem({
        variables: { roomId: room.id, userId: currentUserId, title }
      });
      setNewTitle("");
      setAdding(false);
    } catch (error) {
      mutationError("Unable to add queue item", error);
    }
  };

  const saveRename = async () => {
    const title = editingTitle.trim();
    if (!editingId || !title || !currentUserId) {
      setEditingId(null);
      return;
    }

    try {
      await renameQueueItem({
        variables: {
          roomId: room.id,
          userId: currentUserId,
          itemId: editingId,
          title
        }
      });
      setEditingId(null);
    } catch (error) {
      mutationError("Unable to rename queue item", error);
    }
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveRename();
    }
    if (event.key === "Escape") setEditingId(null);
  };

  const moveItem = async (item: VoteQueueItem, toIndex: number) => {
    if (!currentUserId || toIndex < 0 || toIndex >= room.voteQueue.length) {
      return false;
    }

    try {
      await reorderQueueItem({
        variables: {
          roomId: room.id,
          userId: currentUserId,
          itemId: item.id,
          toIndex
        }
      });
      return true;
    } catch (error) {
      mutationError("Unable to reorder the queue", error);
      return false;
    }
  };

  const startQueuedItem = async (item: VoteQueueItem) => {
    if (!isOwner || !currentUserId || room.isGameOver) return;

    try {
      await startVoteQueueItem({
        variables: {
          roomId: room.id,
          userId: currentUserId,
          itemId: item.id
        }
      });
    } catch (error) {
      mutationError("Unable to put this issue on the table", error);
    }
  };

  const handleQueueDragStart = (item: VoteQueueItem) => {
    if (!isOwner) return;

    queueItemsRef.current = room.voteQueue;
    setQueueItems(room.voteQueue);
    setDraggedItemId(item.id);
  };

  const handleQueueReorder = (items: VoteQueueItem[]) => {
    queueItemsRef.current = items;
    setQueueItems(items);
  };

  const handleQueueDragEnd = async (itemId: string) => {
    const item = room.voteQueue.find((candidate) => candidate.id === itemId);
    const fromIndex = room.voteQueue.findIndex(
      (candidate) => candidate.id === itemId
    );
    const toIndex = queueItemsRef.current.findIndex(
      (candidate) => candidate.id === itemId
    );
    setDraggedItemId(null);

    if (!item || fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      queueItemsRef.current = room.voteQueue;
      setQueueItems(room.voteQueue);
      return;
    }

    setReordering(true);
    const moved = await moveItem(item, toIndex);
    if (!moved) {
      queueItemsRef.current = room.voteQueue;
      setQueueItems(room.voteQueue);
    }
    setReordering(false);
  };

  const returnCurrentItemToQueue = async () => {
    if (!isOwner || !currentUserId || !room.currentQueueItemId) return;

    try {
      await returnCurrentVoteQueueItem({
        variables: {
          roomId: room.id,
          userId: currentUserId
        }
      });
    } catch (error) {
      mutationError("Unable to return this issue to the queue", error);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!currentUserId) return;
    try {
      await removeQueueItem({
        variables: { roomId: room.id, userId: currentUserId, itemId }
      });
    } catch (error) {
      mutationError("Unable to remove queue item", error);
    }
  };

  return (
    <aside
      ref={panelRef}
      aria-label="Vote session"
      style={
        {
          "--vote-session-panel-width": `${panelWidth}px`
        } as CSSProperties
      }
      className={cn(
        "relative z-30 h-full shrink-0 border-r border-border/70",
        "max-[899px]:fixed max-[899px]:bottom-0 max-[899px]:left-0 max-[899px]:top-[56px] max-[899px]:z-[70] max-[899px]:h-auto",
        "bg-background",
        !resizing && "transition-[width,min-width] duration-300 ease-out",
        open
          ? "w-[min(var(--vote-session-panel-width),calc(100vw-24px))] min-w-0 min-[900px]:w-[var(--vote-session-panel-width)] min-[900px]:min-w-[var(--vote-session-panel-width)]"
          : "w-8 min-w-8"
      )}
    >
      {open && (
        <button
          type="button"
          aria-label="Resize vote session panel"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onKeyDown={handleResizeKeyDown}
          className={cn(
            "absolute right-0 top-1/2 z-30 flex h-16 w-6 -translate-y-1/2 translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border border-accent/55 active:cursor-grabbing",
            "bg-background text-accent shadow-[0_0_0_4px_hsl(var(--background)),0_0_14px_rgba(var(--accent-rgb),0.22)]",
            "transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
            resizing && "bg-accent/15"
          )}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
      )}

      {!open ? (
        <button
          type="button"
          aria-label="Open vote session"
          aria-expanded="false"
          onClick={() => setPanelOpen(true)}
          className="group relative flex h-full w-full cursor-pointer items-start justify-center overflow-hidden pt-24 text-accent transition-colors hover:bg-accent/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
        >
          <span className="absolute left-1/2 top-5 flex size-7 -translate-x-1/2 items-center justify-center rounded-md transition-all group-hover:bg-accent/15 group-hover:shadow-[0_0_12px_rgba(var(--accent-rgb),0.18)]">
            <ChevronsRight className="size-4" aria-hidden="true" />
          </span>
          <span className="[writing-mode:vertical-rl] text-[0.58rem] font-bold uppercase tracking-[0.28em] text-accent/80">
            Vote session
          </span>
        </button>
      ) : (
        <div className="vote-session-panel vote-session-panel-scroll mr-3 h-full overflow-y-auto overflow-x-hidden pb-8 pl-6 pr-3 pt-5">
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Vote session
              </h2>
              <p className="mt-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-accent/75">
                {completedCount} complete · {room.voteQueue.length} queued
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Collapse vote session"
              aria-expanded="true"
              onClick={() => setPanelOpen(false)}
              className="size-8 shrink-0 text-accent hover:bg-accent/15 hover:text-accent"
            >
              <ChevronsLeft className="size-4" aria-hidden="true" />
            </Button>
          </header>

          <CurrentVoteCard
            room={room}
            title={currentTitle}
            metrics={currentMetrics}
            canReturnToQueue={
              isOwner && !room.isGameOver && room.currentQueueItemId != null
            }
            returningToQueue={returningCurrentItem}
            onReturnToQueue={() => void returnCurrentItemToQueue()}
          />

          <section className="mt-5" aria-labelledby="up-next-title">
            <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
              <h3
                id="up-next-title"
                className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-accent/80"
              >
                Up next · {room.voteQueue.length}
              </h3>
              {isOwner && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdding((value) => !value)}
                  className="h-8 gap-1 border-accent/60 bg-background/60 px-2.5 text-[0.66rem] uppercase tracking-[0.08em] hover:bg-accent/15 hover:text-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add item
                </Button>
              )}
            </div>

            {adding && isOwner && (
              <form
                onSubmit={(event) => void submitNewItem(event)}
                className="vote-session-form mb-2 rounded-xl border p-2"
              >
                <label htmlFor="new-queue-item" className="sr-only">
                  New queue item
                </label>
                <input
                  id="new-queue-item"
                  ref={newItemInputRef}
                  maxLength={140}
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Issue or story title"
                  className="h-9 w-full rounded-lg border border-border/70 bg-background/75 px-3 text-sm outline-none placeholder:text-muted-foreground/65 focus:border-accent/70 focus:ring-2 focus:ring-accent/20"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAdding(false);
                      setNewTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newTitle.trim() || addLoading}
                  >
                    Add to queue
                  </Button>
                </div>
              </form>
            )}

            {queueItems.length ? (
              <Reorder.Group
                as="div"
                axis="y"
                values={queueItems}
                onReorder={handleQueueReorder}
                className="space-y-2"
                data-queue-dragging={draggedItemId != null}
                role="list"
              >
                {queueItems.map((item, index) => (
                  <Reorder.Item
                    key={item.id}
                    as="div"
                    value={item}
                    role="listitem"
                    dragListener={isOwner}
                    dragMomentum={false}
                    dragElastic={0.06}
                    whileDrag={{ scale: 1.012 }}
                    transition={{
                      layout: {
                        type: "spring",
                        stiffness: 520,
                        damping: 38
                      }
                    }}
                    onDragStart={() => handleQueueDragStart(item)}
                    onDragEnd={() => void handleQueueDragEnd(item.id)}
                    onDoubleClick={() => {
                      if (!draggedItemId) void startQueuedItem(item);
                    }}
                    className={cn(
                      "vote-session-queue-item group relative flex min-h-11 items-center rounded-xl border text-sm",
                      isOwner && "cursor-grab active:cursor-grabbing",
                      draggedItemId &&
                        draggedItemId !== item.id &&
                        "pointer-events-none",
                      draggedItemId === item.id &&
                        "z-20 cursor-grabbing border-accent/75 bg-background shadow-[0_10px_28px_rgba(0,0,0,0.35),0_0_18px_rgba(var(--accent-rgb),0.2)] dark:bg-[hsl(var(--background))]"
                    )}
                  >
                    {isOwner && (
                      <span className="flex w-7 shrink-0 touch-none select-none items-center justify-center text-accent/65">
                        <GripVertical className="size-4" aria-hidden="true" />
                      </span>
                    )}
                    <span className="flex size-8 shrink-0 items-center justify-center border-r border-border/70 font-mono text-xs tabular-nums text-accent">
                      {index + 1}
                    </span>
                    {editingId === item.id ? (
                      <input
                        ref={renameInputRef}
                        maxLength={140}
                        value={editingTitle}
                        onChange={(event) =>
                          setEditingTitle(event.target.value)
                        }
                        onBlur={() => void saveRename()}
                        onKeyDown={handleRenameKeyDown}
                        className="mx-2 min-w-0 flex-1 bg-transparent text-sm outline-none ring-0"
                        aria-label={`Rename ${item.title}`}
                      />
                    ) : (
                      <span className="relative flex h-10 min-w-0 flex-1 items-center overflow-hidden px-3">
                        <span
                          className={cn(
                            "min-w-0 truncate text-[0.78rem] font-medium transition-transform duration-150",
                            isOwner &&
                              !room.isGameOver &&
                              !draggedItemId &&
                              "group-hover:-translate-y-1"
                          )}
                        >
                          {item.title}
                        </span>
                        {isOwner && !room.isGameOver && !draggedItemId && (
                          <span className="pointer-events-none absolute bottom-0.5 left-3 text-[0.48rem] font-semibold uppercase tracking-[0.08em] text-accent/0 transition-colors duration-150 group-hover:text-accent/65">
                            Double-click to put on table
                          </span>
                        )}
                      </span>
                    )}
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mr-1 size-8 shrink-0 text-muted-foreground hover:bg-accent/15 hover:text-accent"
                            aria-label={`Manage ${item.title}`}
                          >
                            <MoreVertical
                              className="size-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingId(item.id);
                              setEditingTitle(item.title);
                            }}
                          >
                            <Pencil className="mr-2 size-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={room.isGameOver}
                            onSelect={() => void startQueuedItem(item)}
                          >
                            <Play className="mr-2 size-3.5" />
                            Put on table
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={index === 0}
                            onSelect={() => void moveItem(item, index - 1)}
                          >
                            <ArrowUp className="mr-2 size-3.5" />
                            Move up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={index === room.voteQueue.length - 1}
                            onSelect={() => void moveItem(item, index + 1)}
                          >
                            <ArrowDown className="mr-2 size-3.5" />
                            Move down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => void removeItem(item.id)}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-3.5" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <p className="vote-session-empty rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                {isOwner
                  ? "Add an issue when the team is ready."
                  : "No queued issues."}
              </p>
            )}
          </section>

          <section className="mt-5" aria-labelledby="history-title">
            <h3
              id="history-title"
              className="mb-2 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-accent/80"
            >
              History · {room.voteHistory.length}
            </h3>
            {room.voteHistory.length ? (
              <div className="space-y-2">
                {[...room.voteHistory].reverse().map((round) => (
                  <HistoryCard
                    key={round.id}
                    round={round}
                    expanded={expandedRoundId === round.id}
                    showVoteChanges={room.showVoteChanges}
                    onToggle={() =>
                      setExpandedRoundId((current) =>
                        current === round.id ? null : round.id
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="vote-session-empty rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                Completed votes will collect here.
              </p>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}

function CurrentVoteCard({
  room,
  title,
  metrics,
  canReturnToQueue,
  returningToQueue,
  onReturnToQueue
}: {
  room: Room;
  title: string;
  metrics: ReturnType<typeof getVoteMetrics>;
  canReturnToQueue: boolean;
  returningToQueue: boolean;
  onReturnToQueue: () => void;
}) {
  const voteCount = room.game.table.length;
  const totalPlayers = room.users.length;

  return (
    <section className="vote-session-current relative overflow-hidden rounded-xl border p-4">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-accent/75">
          {room.isGameOver ? "Current result" : "Current vote"}
        </p>
        {canReturnToQueue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={returningToQueue}
            onClick={onReturnToQueue}
            className="h-6 gap-1 px-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-accent hover:bg-accent/12 hover:text-accent"
          >
            <Undo2 className="size-3" aria-hidden="true" />
            Return to queue
          </Button>
        )}
      </div>
      <h3 className="mt-2 truncate text-sm font-medium">{title}</h3>
      {room.isGameOver ? (
        <>
          <div className="vote-session-current-score mt-3 flex min-h-20 flex-col items-center justify-center rounded-lg border px-3 text-accent-foreground">
            <strong
              className={cn(
                "whitespace-nowrap font-mono leading-none tabular-nums",
                metrics.majorityCard?.includes("|") ? "text-xl" : "text-4xl"
              )}
            >
              {metrics.majorityCard ?? "—"}
            </strong>
            <span className="mt-1 text-[0.56rem] font-bold uppercase tracking-[0.15em]">
              Story points
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1.2fr_1fr] items-end divide-x divide-border/70">
            <Metric
              icon={<UsersRound className="size-4" />}
              label="Avg"
              value={metrics.average.toFixed(1)}
            />
            <span className="flex min-w-0 items-end justify-center">
              <AgreementGauge
                value={metrics.agreement}
                className="h-[44px] w-[72px]"
              />
            </span>
            <Metric label="Votes" value={`${metrics.voteCount}`} />
          </div>
        </>
      ) : (
        <div className="vote-session-waiting mt-3 rounded-lg border px-3 py-4 text-center">
          <strong className="font-mono text-2xl font-medium tabular-nums">
            {voteCount}
            <span className="mx-1.5 text-sm text-muted-foreground">of</span>
            {totalPlayers}
          </strong>
          <p className="mt-1 text-xs text-accent/80">
            {voteCount
              ? `${Math.max(totalPlayers - voteCount, 0)} player${
                  totalPlayers - voteCount === 1 ? "" : "s"
                } remaining`
              : "Waiting for votes"}
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="relative flex min-w-0 items-center justify-center gap-1.5 px-2 text-center">
      {icon && (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/55 text-accent">
          {icon}
        </span>
      )}
      <span className="relative flex flex-col">
        <span className="text-[0.5rem] font-bold uppercase tracking-[0.12em] text-accent/70">
          {label}
        </span>
        <strong className="font-mono text-base tabular-nums">{value}</strong>
      </span>
    </div>
  );
}

function getPhaseMetrics(round: RoundVoteHistory, phase: number) {
  return getVoteMetrics(
    round.votes.map((vote) => {
      const selection = vote.selections
        .filter((candidate) => candidate.phase === phase)
        .at(-1);

      return {
        card: selection?.card ?? null,
        value: selection?.value ?? null
      };
    })
  );
}

function HistoryCard({
  round,
  expanded,
  showVoteChanges,
  onToggle
}: {
  round: RoundVoteHistory;
  expanded: boolean;
  showVoteChanges: boolean;
  onToggle: () => void;
}) {
  const metrics = getVoteMetrics(round.votes);
  const title = round.issueTitle?.trim() || issueFallback(round.roundNumber);
  const isRevote = round.revoteCount > 0;
  const originalMetrics = isRevote ? getPhaseMetrics(round, 0) : null;
  const finalMetrics = isRevote
    ? getPhaseMetrics(round, round.revoteCount)
    : null;

  return (
    <article
      className={cn(
        "history-card overflow-hidden rounded-[10px] border",
        expanded && "history-card-expanded"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="history-card-button grid min-h-[78px] w-full grid-cols-[48px_minmax(0,1fr)_16px] items-center gap-3 px-3 py-1.5 text-left hover:bg-accent/[0.055] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/35"
        aria-expanded={expanded}
      >
        <span
          className={cn(
            "history-card-result flex h-[66px] w-12 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border font-mono font-semibold leading-none text-accent-foreground",
            !metrics.majorityCard?.includes("|") && "text-[1.45rem]"
          )}
        >
          <HistoryResultValue value={metrics.majorityCard} />
        </span>
        <span className="history-card-content flex min-w-0 flex-col self-stretch py-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="block min-w-0 truncate text-[0.88rem] font-semibold leading-5">
              {title}
            </span>
            {isRevote && (
              <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[0.45rem] font-bold uppercase tracking-[0.12em] text-accent">
                Revote
              </span>
            )}
          </span>
          <span className="history-card-metrics mt-auto grid min-w-0 grid-cols-[minmax(48px,1fr)_68px_minmax(42px,1fr)] items-end divide-x divide-border/65">
            <HistoryAverage value={metrics.average.toFixed(1)} />
            <HistoryAgreementGauge value={metrics.agreement} />
            <HistoryVoteCount value={metrics.voteCount} />
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="size-4 shrink-0 text-accent" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-accent" />
        )}
      </button>
      {expanded && (
        <div className="history-card-details border-t px-3">
          {isRevote && originalMetrics && finalMetrics && (
            <RevoteSummary
              originalResult={originalMetrics.majorityCard}
              finalResult={finalMetrics.majorityCard}
              revoteCount={round.revoteCount}
            />
          )}
          {round.votes.map((vote) => (
            <HistoryVote
              key={vote.userId}
              vote={vote}
              revoteCount={round.revoteCount}
              showVoteChanges={showVoteChanges}
            />
          ))}
          <p className="border-t border-border/40 py-2 text-[0.54rem] font-medium text-accent/70">
            Completed {formatCompletedAt(round.completedAt)}
          </p>
        </div>
      )}
    </article>
  );
}

function HistoryResultValue({ value }: { value: string | null }) {
  if (!value) return <Check className="size-5" />;

  const tiedValues = value.split(" | ");
  if (tiedValues.length === 1) return value;

  return (
    <span
      className="flex min-w-0 flex-col items-center justify-center"
      aria-label={`${tiedValues.join(" and ")} tie`}
    >
      <span className="mb-1 text-[0.4rem] font-bold uppercase tracking-[0.13em] opacity-75">
        Tie
      </span>
      <span
        className={cn(
          "flex items-center justify-center font-mono font-semibold tabular-nums",
          tiedValues.length > 2 ? "gap-0.5 text-[0.58rem]" : "gap-1 text-sm"
        )}
      >
        {tiedValues.map((tiedValue, index) => (
          <span key={`${tiedValue}-${index}`} className="contents">
            {index > 0 && (
              <span
                className="h-4 w-px shrink-0 bg-accent-foreground/45"
                aria-hidden="true"
              />
            )}
            <span>{tiedValue}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

function HistoryAverage({ value }: { value: string }) {
  return (
    <span className="history-average flex min-w-0 items-center justify-start px-1">
      <span className="flex min-w-0 flex-col leading-none">
        <span className="history-metric-label text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-accent/70">
          Avg
        </span>
        <strong className="history-metric-value mt-1 font-mono text-base font-medium tabular-nums text-foreground">
          {value}
        </strong>
      </span>
    </span>
  );
}

function HistoryAgreementGauge({ value }: { value: number }) {
  return (
    <span className="history-agreement flex min-w-0 items-end justify-center self-stretch">
      <AgreementGauge
        value={value}
        className="history-agreement-gauge h-[42px] w-16"
      />
    </span>
  );
}

function AgreementGauge({
  value,
  className
}: {
  value: number;
  className?: string;
}) {
  const agreement = Math.max(0, Math.min(100, value));

  return (
    <span
      role="img"
      aria-label={`${agreement.toFixed(0)}% agreement`}
      className={cn("relative block", className)}
    >
      <svg
        viewBox="0 0 72 42"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <path
          d="M7,37 A29,29 0 0,1 65,37"
          fill="none"
          stroke="hsl(var(--accent-hue) 34% 20% / 0.8)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M7,37 A29,29 0 0,1 65,37"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="5"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - agreement}
          className="drop-shadow-[0_0_4px_rgba(var(--accent-rgb),0.7)]"
        />
      </svg>
      <span className="absolute inset-x-0 bottom-0.5 flex flex-col items-center text-center leading-none">
        <strong className="font-mono text-[0.84rem] font-medium tabular-nums">
          {agreement.toFixed(0)}%
        </strong>
        <span className="history-metric-label mt-0.5 text-[0.43rem] font-bold uppercase tracking-[0.12em] text-accent/75">
          Agree
        </span>
      </span>
    </span>
  );
}

function RevoteSummary({
  originalResult,
  finalResult,
  revoteCount
}: {
  originalResult: string | null;
  finalResult: string | null;
  revoteCount: number;
}) {
  return (
    <div className="my-2 grid grid-cols-[1fr_auto_1fr] items-center rounded-md border border-accent/25 bg-accent/[0.07] px-2 py-1.5">
      <span className="flex flex-col items-center">
        <span className="text-[0.46rem] font-bold uppercase tracking-[0.12em] text-accent/65">
          Original result
        </span>
        <strong className="mt-0.5 font-mono text-sm tabular-nums">
          {originalResult ?? "—"}
        </strong>
      </span>
      <span className="flex flex-col items-center px-2 text-accent">
        <span className="text-[0.46rem] font-bold uppercase tracking-[0.12em]">
          {revoteCount > 1 ? `Revote ${revoteCount}` : "Revote"}
        </span>
        <ChevronRight className="mt-0.5 size-3.5" aria-hidden="true" />
      </span>
      <span className="flex flex-col items-center">
        <span className="text-[0.46rem] font-bold uppercase tracking-[0.12em] text-accent/65">
          Final result
        </span>
        <strong className="mt-0.5 font-mono text-sm tabular-nums text-accent">
          {finalResult ?? "—"}
        </strong>
      </span>
    </div>
  );
}

function HistoryVoteCount({ value }: { value: number }) {
  return (
    <span className="history-vote-count flex min-w-0 flex-col items-center justify-end px-1 leading-none">
      <span className="flex items-center gap-1">
        <strong className="history-metric-value font-mono text-base font-medium tabular-nums text-foreground">
          {value}
        </strong>
        <UsersRound
          aria-hidden="true"
          className="history-vote-count-icon size-3.5 text-accent/75"
          strokeWidth={1.6}
        />
      </span>
      <span className="history-metric-label mt-1 text-[0.5rem] font-semibold uppercase tracking-[0.13em] text-accent/70">
        Votes
      </span>
    </span>
  );
}

function HistoryVote({
  vote,
  revoteCount,
  showVoteChanges
}: {
  vote: ArchivedPlayerVote;
  revoteCount: number;
  showVoteChanges: boolean;
}) {
  const selections = vote.selections.map((selection) => selection.card);
  const phaseSelections = Array.from({ length: revoteCount + 1 }, (_, phase) =>
    vote.selections.filter((selection) => selection.phase === phase).at(-1)
  );
  const isRevote = revoteCount > 0;
  const changed =
    !isRevote &&
    showVoteChanges &&
    selections.length > 1 &&
    selections.some((selection) => selection !== selections.at(-1));

  return (
    <div className="flex min-h-[30px] items-center gap-2 border-b border-border/40 py-1 last:border-b-0">
      <UserRound
        aria-hidden="true"
        className="size-3.5 shrink-0 text-accent/75"
        strokeWidth={1.5}
      />
      <span className="min-w-0 flex-1 truncate text-[0.78rem]">
        {vote.username}
      </span>
      <span className="flex shrink-0 items-center gap-1 font-mono text-[0.68rem] tabular-nums text-muted-foreground">
        {isRevote ? (
          <>
            {phaseSelections.map((selection, index) => (
              <span key={`phase-${index}`} className="contents">
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[0.42rem] font-sans font-bold uppercase tracking-[0.08em] text-accent/60">
                    {index === 0
                      ? "Original"
                      : `Revote${index > 1 ? ` ${index}` : ""}`}
                  </span>
                  <span className="rounded border border-accent/35 px-1.5 py-0.5 text-foreground">
                    {selection?.card ?? "—"}
                  </span>
                </span>
                {index < phaseSelections.length - 1 && (
                  <ChevronRight className="mt-2.5 size-3 text-accent/70" />
                )}
              </span>
            ))}
          </>
        ) : changed ? (
          <>
            {selections.map((selection, index) => (
              <span key={`${selection}-${index}`} className="contents">
                <span className="rounded border border-accent/35 px-1.5 py-0.5 text-foreground">
                  {selection}
                </span>
                {index < selections.length - 1 && (
                  <ChevronRight className="size-3 text-accent/70" />
                )}
              </span>
            ))}
          </>
        ) : (
          <span className="rounded border border-accent/35 px-1.5 py-0.5 text-foreground">
            {vote.card ?? "—"}
          </span>
        )}
      </span>
    </div>
  );
}
