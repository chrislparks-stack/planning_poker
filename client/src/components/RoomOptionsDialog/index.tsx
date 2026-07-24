import {
  Clock3,
  Eye,
  EyeOff,
  Layers3,
  LockKeyhole,
  PencilLine,
  RotateCcw,
  Settings2,
  type LucideIcon
} from "lucide-react";
import { FC, useEffect, useMemo, useRef, useState } from "react";

import {
  useRenameRoomMutation,
  useToggleCensorVotesMutation,
  useToggleConfirmNewGameMutation,
  useToggleCountdownOptionMutation,
  useToggleLockVotesMutation,
  useToggleShowVoteChangesMutation,
  useUpdateDeckMutation
} from "@/api";
import { Button } from "@/components/ui/button";
import { CardFan } from "@/components/ui/card-fan.tsx";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OptionDialogContent } from "@/components/ui/option-dialog-content";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Room } from "@/types";

interface RoomOptionsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  room?: Room;
}

interface SettingRowProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  onCheckedChange: (enabled: boolean) => void;
}

const DEFAULT_CARDS = [0, 0.5, 1, 2, 3, 5, 8, 13, 21, "?", "☕"];

const sortCards = (cards: (string | number)[]) =>
  [...cards].sort(
    (a, b) =>
      DEFAULT_CARDS.findIndex((card) => String(card) === String(a)) -
      DEFAULT_CARDS.findIndex((card) => String(card) === String(b))
  );

function SettingRow({
  id,
  title,
  description,
  checked,
  disabled,
  icon: Icon,
  onCheckedChange
}: SettingRowProps) {
  return (
    <div
      data-setting-row={id}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border/50 bg-background/55 p-3.5",
        "transition-colors hover:border-accent/35 hover:bg-background/75",
        disabled && "opacity-60"
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="cursor-pointer text-sm font-semibold leading-tight"
        >
          {title}
        </label>
        <p
          id={`${id}-description`}
          className="mt-1 text-xs leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
      </div>
      <Switch
        id={id}
        aria-describedby={`${id}-description`}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        labels={["Off", "On"]}
        size="sm"
        className="shrink-0"
      />
    </div>
  );
}

export const RoomOptionsDialog: FC<RoomOptionsDialogProps> = ({
  open,
  setOpen,
  room
}) => {
  const { toast } = useToast();
  const [updateDeck, { loading: deckLoading }] = useUpdateDeckMutation();
  const [renameRoom, { loading: renameLoading }] = useRenameRoomMutation();
  const [toggleCountdownOption, { loading: countdownLoading }] =
    useToggleCountdownOptionMutation();
  const [toggleConfirmNewGame, { loading: confirmLoading }] =
    useToggleConfirmNewGameMutation();
  const [toggleShowVoteChanges, { loading: voteChangesLoading }] =
    useToggleShowVoteChangesMutation();
  const [toggleCensorVotes, { loading: censorVotesLoading }] =
    useToggleCensorVotesMutation();
  const [toggleLockVotes, { loading: lockVotesLoading }] =
    useToggleLockVotesMutation();

  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>([
    1, 2, 3, 5, 8
  ]);
  const [originalCards, setOriginalCards] = useState<(string | number)[]>([]);
  const [countdownEnabled, setCountdownEnabled] = useState(
    room?.countdownEnabled ?? false
  );
  const [confirmNewGame, setConfirmNewGame] = useState(
    room?.confirmNewGame ?? true
  );
  const [showVoteChanges, setShowVoteChanges] = useState(
    room?.showVoteChanges ?? true
  );
  const [censorVotes, setCensorVotes] = useState(room?.censorVotes ?? false);
  const [lockVotes, setLockVotes] = useState(room?.lockVotes ?? false);
  const initializedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedRoomRef.current = null;
      return;
    }
    if (!room || initializedRoomRef.current === room.id) return;

    setRoomId(room.id);
    setRoomName(room.name ?? "");
    setOriginalName(room.name ?? "");
    setSelectedCards(room.deck.cards);
    setOriginalCards(sortCards(room.deck.cards));
    setCountdownEnabled(room.countdownEnabled ?? false);
    setConfirmNewGame(room.confirmNewGame ?? true);
    setShowVoteChanges(room.showVoteChanges ?? true);
    setCensorVotes(room.censorVotes ?? false);
    setLockVotes(room.lockVotes ?? false);
    initializedRoomRef.current = room.id;
  }, [room, open]);

  const sortedSelectedCards = useMemo(
    () => sortCards(selectedCards),
    [selectedCards]
  );
  const hasDraftChanges =
    roomName.trim() !== originalName ||
    JSON.stringify(sortedSelectedCards) !== JSON.stringify(originalCards);

  const toggleCardSelection = (card: string | number) => {
    const cardStr = String(card);
    setSelectedCards((current) =>
      current.some((selected) => String(selected) === cardStr)
        ? current.filter((selected) => String(selected) !== cardStr)
        : [...current, cardStr]
    );
  };

  const handleRenameRoom = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === originalName) return;

    await renameRoom({ variables: { roomId, name: trimmed } });

    try {
      const stored = localStorage.getItem("Room");
      if (stored) {
        const roomData = JSON.parse(stored);
        roomData.RoomName = trimmed;
        localStorage.setItem("Room", JSON.stringify(roomData));
      }
    } catch {
      console.warn("Failed updating room name in localStorage");
    }

    setOriginalName(trimmed);
    setRoomName(trimmed);
    toast({
      title: "Room renamed",
      description: `Room name updated to "${trimmed}".`,
      duration: 3000
    });
  };

  const handleUpdateCards = async (cards: (string | number)[]) => {
    const sorted = sortCards(cards);
    if (JSON.stringify(sorted) === JSON.stringify(originalCards)) return;

    await updateDeck({
      variables: {
        roomId,
        cards: sorted.map(String)
      }
    });

    try {
      const stored = localStorage.getItem("Room");
      if (stored) {
        const roomData = JSON.parse(stored);
        roomData.Cards = sorted;
        localStorage.setItem("Room", JSON.stringify(roomData));
      }
    } catch {
      console.warn("Failed updating Room in localStorage");
    }

    setOriginalCards(sorted);
    toast({
      title: "Cards updated",
      duration: 3000,
      description: `Deck updated — ${sorted.length} cards.`
    });
  };

  const updateBooleanSetting = async ({
    enabled,
    setValue,
    mutate,
    enabledTitle,
    disabledTitle,
    errorTitle
  }: {
    enabled: boolean;
    setValue: (enabled: boolean) => void;
    mutate: () => Promise<unknown>;
    enabledTitle: string;
    disabledTitle: string;
    errorTitle: string;
  }) => {
    setValue(enabled);
    try {
      await mutate();
      toast({
        title: enabled ? enabledTitle : disabledTitle,
        duration: 2500
      });
    } catch (err) {
      setValue(!enabled);
      toast({
        title: errorTitle,
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive"
      });
    }
  };

  const behaviorSettings: SettingRowProps[] = [
    {
      id: "countdown-enabled",
      title: "Countdown reveal",
      description:
        "Run a synchronized 3–2–1 countdown before everyone’s cards are shown.",
      checked: countdownEnabled,
      disabled: countdownLoading,
      icon: Clock3,
      onCheckedChange: (enabled) =>
        void updateBooleanSetting({
          enabled,
          setValue: setCountdownEnabled,
          mutate: () =>
            toggleCountdownOption({ variables: { roomId, enabled } }),
          enabledTitle: "Countdown enabled",
          disabledTitle: "Countdown disabled",
          errorTitle: "Error updating countdown option"
        })
    },
    {
      id: "confirm-new-game",
      title: "Confirm before new game",
      description:
        "Ask for confirmation before the current votes are cleared and a new round begins.",
      checked: confirmNewGame,
      disabled: confirmLoading,
      icon: RotateCcw,
      onCheckedChange: (enabled) =>
        void updateBooleanSetting({
          enabled,
          setValue: setConfirmNewGame,
          mutate: () =>
            toggleConfirmNewGame({ variables: { roomId, enabled } }),
          enabledTitle: "Confirmation enabled",
          disabledTitle: "Confirmation disabled",
          errorTitle: "Error updating confirmation setting"
        })
    },
    {
      id: "show-vote-changes",
      title: "Show vote changes",
      description:
        "Show the original revealed vote and animate the direction when someone changes it.",
      checked: showVoteChanges,
      disabled: voteChangesLoading,
      icon: Eye,
      onCheckedChange: (enabled) =>
        void updateBooleanSetting({
          enabled,
          setValue: setShowVoteChanges,
          mutate: () =>
            toggleShowVoteChanges({ variables: { roomId, enabled } }),
          enabledTitle: "Vote changes visible",
          disabledTitle: "Vote changes hidden",
          errorTitle: "Error updating vote-change visibility"
        })
    },
    {
      id: "censor-votes",
      title: "Censor individual votes",
      description:
        "Blur each revealed card and hide its vote-change label while keeping totals and group results visible.",
      checked: censorVotes,
      disabled: censorVotesLoading,
      icon: EyeOff,
      onCheckedChange: (enabled) =>
        void updateBooleanSetting({
          enabled,
          setValue: setCensorVotes,
          mutate: () => toggleCensorVotes({ variables: { roomId, enabled } }),
          enabledTitle: "Individual votes censored",
          disabledTitle: "Individual votes visible",
          errorTitle: "Error updating vote censorship"
        })
    },
    {
      id: "lock-votes",
      title: "Lock votes after reveal",
      description:
        "Prevent vote changes after reveal and let the room owner start a linked issue revote.",
      checked: lockVotes,
      disabled: lockVotesLoading,
      icon: LockKeyhole,
      onCheckedChange: (enabled) =>
        void updateBooleanSetting({
          enabled,
          setValue: setLockVotes,
          mutate: () => toggleLockVotes({ variables: { roomId, enabled } }),
          enabledTitle: "Votes lock after reveal",
          disabledTitle: "Post-reveal vote changes allowed",
          errorTitle: "Error updating vote locking"
        })
    }
  ];

  const handleDone = async () => {
    try {
      if (roomName.trim() !== originalName) {
        await handleRenameRoom(roomName);
      }
      if (
        JSON.stringify(sortedSelectedCards) !== JSON.stringify(originalCards)
      ) {
        await handleUpdateCards(sortedSelectedCards);
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: "Error saving changes",
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && selectedCards.length < 1) {
          toast({
            title: "Cannot Exit",
            duration: 3000,
            description: "Please select at least one card",
            variant: "destructive"
          });
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <OptionDialogContent
        data-testid="room-options-dialog"
        className="max-w-[960px]"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-accent via-accent/85 to-accent/35" />

        <DialogHeader className="shrink-0 border-b border-border/60 bg-card/30 px-5 py-4 text-left sm:px-7 sm:py-5">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-sm">
              <Settings2 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Room options
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl text-sm leading-relaxed">
                Configure the room identity, voting deck, and how each round
                behaves.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="space-y-5 border-b border-border/60 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <section aria-labelledby="room-identity-title">
              <div className="mb-3 flex items-center gap-2">
                <PencilLine aria-hidden="true" className="size-4 text-accent" />
                <h3
                  id="room-identity-title"
                  className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Room identity
                </h3>
              </div>
              <div className="rounded-xl border border-border/55 bg-card/45 p-4">
                <label
                  htmlFor="room-options-name"
                  className="text-sm font-semibold"
                >
                  Room name
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  The name shown to everyone who joins this room.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="room-options-name"
                    value={roomName}
                    onChange={(event) => setRoomName(event.target.value)}
                    placeholder="Enter room name"
                    className="h-10 flex-1 bg-background/65"
                  />
                  <Button
                    onClick={() => void handleRenameRoom(roomName)}
                    disabled={
                      renameLoading ||
                      !roomName.trim() ||
                      roomName.trim() === originalName
                    }
                    variant="outline"
                    className="h-10 shrink-0"
                  >
                    {renameLoading ? "Saving…" : "Rename"}
                  </Button>
                </div>
              </div>
            </section>

            <section aria-labelledby="voting-deck-title">
              <div className="mb-3 flex items-center gap-2">
                <Layers3 aria-hidden="true" className="size-4 text-accent" />
                <h3
                  id="voting-deck-title"
                  className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Voting deck
                </h3>
              </div>
              <div className="overflow-visible rounded-xl border border-border/55 bg-card/45 p-4">
                <div>
                  <h4 className="text-sm font-semibold">Available cards</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose which estimates players can use during voting.
                  </p>
                </div>
                <CardFan
                  selectedCards={selectedCards}
                  toggleCardSelection={toggleCardSelection}
                  options
                  className="mt-1"
                />
              </div>
            </section>
          </div>

          <aside className="space-y-4 bg-muted/10 p-5 sm:p-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Round behavior
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                These settings apply immediately to everyone in the room.
              </p>
            </div>

            <div className="space-y-2.5">
              {behaviorSettings.map((setting) => (
                <SettingRow key={setting.id} {...setting} />
              ))}
            </div>
          </aside>
        </div>

        <DialogFooter className="shrink-0 items-center gap-3 border-t border-border/60 bg-card/45 px-5 py-3.5 sm:px-7 sm:py-4">
          <p
            aria-live="polite"
            className="mr-auto text-xs text-muted-foreground"
          >
            {hasDraftChanges
              ? "Unsaved name or deck changes"
              : "All name and deck changes saved"}
          </p>
          <Button
            onClick={() => void handleDone()}
            disabled={deckLoading || renameLoading}
            className="min-w-28"
          >
            {deckLoading || renameLoading ? "Saving…" : "Save & close"}
          </Button>
        </DialogFooter>
      </OptionDialogContent>
    </Dialog>
  );
};
