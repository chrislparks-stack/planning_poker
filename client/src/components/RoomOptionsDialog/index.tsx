import { FC, useEffect, useState } from "react";

import {
  useRenameRoomMutation,
  useUpdateDeckMutation,
  useToggleCountdownOptionMutation
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@/types";
import { CardFan } from "@/components/ui/card-fan.tsx";

interface RoomOptionsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  room?: Room;
}

const DEFAULT_CARDS = [0, 0.5, 1, 2, 3, 5, 8, 13, 21, "?", "☕"];

export const RoomOptionsDialog: FC<RoomOptionsDialogProps> = ({
  open,
  setOpen,
  room
}) => {
  const { toast } = useToast();
  const [updateDeck, { loading: deckLoading }] = useUpdateDeckMutation();
  const [renameRoom, { loading: renameLoading }] = useRenameRoomMutation();
  const [toggleCountdownOption] = useToggleCountdownOptionMutation();

  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>([
    1, 2, 3, 5, 8
  ]);
  const [originalCards, setOriginalCards] = useState<(string | number)[]>([]);
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(
    room?.countdownEnabled ?? false
  );

  useEffect(() => {
    if (room && open) {
      setRoomId(room.id);
      setRoomName(room.name ?? "");
      setOriginalName(room.name ?? "");
      setSelectedCards(room.deck.cards);
      setOriginalCards(room.deck.cards);
      setCountdownEnabled(room.countdownEnabled ?? false);
    }
  }, [room, open]);

  const toggleCardSelection = (card: string | number) => {
    const cardStr = String(card);
    setSelectedCards((prev) =>
      prev.includes(cardStr)
        ? prev.filter((c) => c !== cardStr)
        : [...prev, cardStr]
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

    toast({
      title: "Room renamed",
      description: `Room name updated to "${trimmed}".`,
      duration: 3000
    });
  };

  const handleUpdateCards = async (cards: (string | number)[]) => {
    const sortedSelectedCards = [...cards].sort(
      (a, b) =>
        DEFAULT_CARDS.findIndex((card) => String(card) === String(a)) -
        DEFAULT_CARDS.findIndex((card) => String(card) === String(b))
    );

    if (JSON.stringify(sortedSelectedCards) === JSON.stringify(originalCards))
      return;

    await updateDeck({
      variables: {
        roomId,
        cards: sortedSelectedCards.map(String)
      }
    });

    try {
      const stored = localStorage.getItem("Room");
      if (stored) {
        const roomData = JSON.parse(stored);
        roomData.Cards = sortedSelectedCards;
        localStorage.setItem("Room", JSON.stringify(roomData));
      }
    } catch {
      console.warn("Failed updating Room in localStorage");
    }

    setOriginalCards(sortedSelectedCards);

    toast({
      title: "Cards updated",
      duration: 3000,
      description: `Deck updated — ${sortedSelectedCards.length} cards.`
    });
  };

  const handleDone = async () => {
    try {
      if (roomName.trim() !== originalName) {
        await handleRenameRoom(roomName);
      }

      const sorted = [...selectedCards].sort(
        (a, b) =>
          DEFAULT_CARDS.findIndex((card) => String(card) === String(a)) -
          DEFAULT_CARDS.findIndex((card) => String(card) === String(b))
      );
      if (JSON.stringify(sorted) !== JSON.stringify(originalCards)) {
        await handleUpdateCards(sorted);
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

  const selectedCount = selectedCards.length;

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
      <DialogContent
        className="max-w-[80vw] sm:max-w-[440px] md:max-w-[520px] lg:max-w-[600px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Room Options</DialogTitle>
        </DialogHeader>

        {/* ===== Room Rename Section ===== */}
        <section
          aria-labelledby="room-name-heading"
          className="mt-2 rounded-lg border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 id="room-name-heading" className="text-sm font-semibold">
                Room name
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Set a custom name for your room.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              className="flex-1"
            />
            <Button
              onClick={() => handleRenameRoom(roomName)}
              disabled={renameLoading || roomName.trim() === originalName}
            >
              {renameLoading ? "Saving..." : "Rename"}
            </Button>
          </div>
        </section>

        {/* ===== Countdown Reveal Option ===== */}
        <section
          aria-labelledby="countdown-option-heading"
          className="mt-4 rounded-lg border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="max-w-[70%]">
              <h3
                id="countdown-option-heading"
                className="text-[0.95rem] font-semibold tracking-tight text-foreground"
              >
                Countdown reveal
              </h3>
              <p className="mt-1.5 text-[0.83rem] leading-relaxed text-muted-foreground">
                Adds a dramatic reveal — when enabled, everyone sees a
                synchronized
                <span className="font-semibold text-foreground">
                  {" "}
                  3-2-1 countdown{" "}
                </span>
                before cards are shown. The room owner can cancel it
                mid-countdown if more discussion is needed.
              </p>
            </div>

            <div className="flex items-center justify-center">
              <Switch
                id="countdown-enabled"
                checked={countdownEnabled}
                onCheckedChange={async (enabled) => {
                  try {
                    setCountdownEnabled(enabled);
                    await toggleCountdownOption({
                      variables: { roomId, enabled }
                    });
                    toast({
                      title: enabled
                        ? "Countdown enabled"
                        : "Countdown disabled",
                      duration: 2500
                    });
                  } catch (err) {
                    console.error("Failed to toggle countdown option:", err);
                    toast({
                      title: "Error updating countdown option",
                      description:
                        err instanceof Error
                          ? err.message
                          : "An unknown error occurred.",
                      variant: "destructive"
                    });
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* ===== Card selection Section ===== */}
        <section
          aria-labelledby="room-cards-heading"
          className="mt-4 rounded-lg border bg-card p-4 overflow-visible"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 id="room-cards-heading" className="text-sm font-semibold">
                Card selection
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick which poker cards players can choose from in this room.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground">
                Selected:{" "}
                <span className="font-medium text-foreground">
                  {selectedCount}
                </span>
              </div>
            </div>
          </div>

          <CardFan
            selectedCards={selectedCards}
            toggleCardSelection={toggleCardSelection}
          />
        </section>

        {/* ===== Footer with unified "Done" button ===== */}
        <DialogFooter className="mt-6 flex justify-end">
          <Button
            onClick={handleDone}
            disabled={deckLoading || renameLoading}
            variant="default"
          >
            {deckLoading || renameLoading ? "Saving..." : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
