import { FC, useEffect, useState } from "react";

import {
  useRenameRoomMutation,
  useUpdateDeckMutation,
  useToggleCountdownOptionMutation,
  useToggleConfirmNewGameMutation
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent, DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@/types";
import { CardFan } from "@/components/ui/card-fan.tsx";
import {VisuallyHidden} from "@radix-ui/react-visually-hidden";

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
  const [toggleConfirmNewGame] = useToggleConfirmNewGameMutation();

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
  const [confirmNewGame, setConfirmNewGame] = useState<boolean>(
      room?.confirmNewGame ?? true
  );

  useEffect(() => {
    if (room && open) {
      setRoomId(room.id);
      setRoomName(room.name ?? "");
      setOriginalName(room.name ?? "");
      setSelectedCards(room.deck.cards);
      setOriginalCards(room.deck.cards);
      setCountdownEnabled(room.countdownEnabled ?? false);
      setConfirmNewGame(room.confirmNewGame ?? true);
    }
  }, [room, open]);

  const [sizeKey, setSizeKey] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setSizeKey(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


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

  return (
      <Dialog
        key={sizeKey}
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
          className="
            flex flex-col w-[90vw] max-w-[700px] max-h-[90vh] sm:max-h-[92vh]
            rounded-2xl backdrop-blur-md bg-background/80
            border border-border/50 shadow-[0_8px_32px_rgb(0_0_0_/_0.4)]
            p-0 overflow-hidden animate-in fade-in-0 zoom-in-95
          "
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >

          <VisuallyHidden>
            <DialogTitle> Room Options </DialogTitle>
            <DialogDescription>
              Adjust the room options such as name, card selection or reveal type
            </DialogDescription>
          </VisuallyHidden>

          {/* Accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60" />

          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Room Options
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable main content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* ===== Room Rename ===== */}
            <section className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 shadow-sm transition-colors">
              <h3 className="text-sm font-semibold">Room Name</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Set a custom name for your room
              </p>
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

            {/* ===== Options Grid ===== */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Countdown */}
              <section className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 shadow-sm transition-colors">
                <h3 className="text-sm font-semibold mb-2">Countdown Reveal</h3>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground leading-snug pr-4 flex-1">
                    When enabled, adds a synchronized <span className="font-semibold">3-2-1</span> reveal before showing cards, otherwise cards are shown immediately
                  </p>
                  <Switch
                    id="countdown-enabled"
                    checked={countdownEnabled}
                    onCheckedChange={async (enabled) => {
                      try {
                        setCountdownEnabled(enabled);
                        await toggleCountdownOption({ variables: { roomId, enabled } });
                        toast({
                          title: enabled ? "Countdown enabled" : "Countdown disabled",
                          duration: 2500,
                        });
                      } catch (err) {
                        toast({
                          title: "Error updating countdown option",
                          description:
                              err instanceof Error
                                  ? err.message
                                  : "An unknown error occurred.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="flex-shrink-0"
                  />
                </div>
              </section>

              {/* Confirm new game */}
              <section className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 shadow-sm transition-colors">
                <h3 className="text-sm font-semibold mb-2">Confirm Before New Game</h3>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground leading-snug pr-4 flex-1">
                    When disabled, starting a new game skips the confirmation dialog and will reset all votes immediately
                  </p>
                  <Switch
                    id="confirm-new-game"
                    checked={confirmNewGame}
                    onCheckedChange={async (enabled) => {
                      try {
                        setConfirmNewGame(enabled);
                        await toggleConfirmNewGame({ variables: { roomId, enabled } });
                        toast({
                          title: enabled
                              ? "Confirmation enabled"
                              : "Confirmation disabled",
                          duration: 2500,
                        });
                      } catch (err) {
                        toast({
                          title: "Error updating setting",
                          description:
                              err instanceof Error
                                  ? err.message
                                  : "An unknown error occurred.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="flex-shrink-0"
                  />
                </div>
              </section>
            </div>

            {/* ===== Card Selection ===== */}
            <section className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 overflow-visible shadow-sm transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Card Selection</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick which poker cards players can choose to vote
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <CardFan
                  selectedCards={selectedCards}
                  toggleCardSelection={toggleCardSelection}
                  options
                />
              </div>
            </section>
          </div>

          {/* Fixed footer */}
          <DialogFooter className="px-6 py-3 border-t bg-card/60 backdrop-blur-sm shrink-0">
            <Button
              onClick={handleDone}
              disabled={deckLoading || renameLoading}
              variant="default"
              className="ml-auto"
            >
              {deckLoading || renameLoading ? "Saving..." : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};
