import { FC, useEffect, useState } from "react";

import { useUpdateDeckMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@/types";

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
  const [updateDeck, { loading }] = useUpdateDeckMutation();
  const [roomId, setRoomId] = useState("");
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>([
    1, 2, 3, 5, 8
  ]);

  useEffect(() => {
    if (room && open) {
      setSelectedCards(room.deck.cards);
      setRoomId(room.id);
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

  const handleUpdateCards = async () => {
    if (selectedCards.length < 1) {
      toast({
        title: "No cards selected",
        description: "Please select at least one card before updating.",
        variant: "destructive"
      });
      return;
    }

    const sortedSelectedCards = [...selectedCards].sort(
      (a, b) =>
        DEFAULT_CARDS.findIndex((card) => String(card) === String(a)) -
        DEFAULT_CARDS.findIndex((card) => String(card) === String(b))
    );

    try {
      await updateDeck({
        variables: {
          input: {
            roomId,
            cards: sortedSelectedCards.map(String)
          }
        }
      });

      try {
        const stored = localStorage.getItem("Room");
        let roomData;
        if (stored) {
          try {
            roomData = JSON.parse(stored);
          } catch {
            roomData = null;
          }
        }
        if (roomData) {
          roomData.Cards = sortedSelectedCards;
          localStorage.setItem("Room", JSON.stringify(roomData));
        }
      } catch (err) {
        console.warn("Failed updating Room in localStorage:", err);
      }

      toast({
        title: "Cards updated",
        duration: 3000,
        description: `Deck updated — ${sortedSelectedCards.length} cards.`
      });
    } catch (err: unknown) {
      console.error("Failed to update deck:", err);
      toast({
        title: "Failed to update cards",
        description:
          err && (err as Error).message
            ? `Error: ${(err as Error).message}`
            : "An unknown error occurred.",
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
        className="sm:max-w-[640px]" // a little wider so the fan has room
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Room Options</DialogTitle>
        </DialogHeader>

        {/* ===== Card picker section (Update button integrated here) ===== */}
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

          {/* picker area — increased height to accommodate the fan */}
          <div className="relative mt-4 h-56 w-full">
            <div className="mb-2 text-sm">Pick poker cards to use:</div>

            {/* fan wrapper is centered and absolutely-positioned buttons use transforms */}
            <div className="flex justify-center items-baseline h-full overflow-visible">
              {DEFAULT_CARDS.map((card, index) => {
                const total = DEFAULT_CARDS.length;
                const middle = (total - 1) / 2;
                const offset = index - middle;

                const rotate = offset * 5.5;
                const spacing = 42;
                const translateX = offset * spacing;

                const arcStrength = 2.2;
                const arc = Math.pow(offset, 2) * arcStrength;

                const selected = selectedCards.includes(String(card));

                return (
                  <button
                    key={String(card)}
                    onClick={() => toggleCardSelection(card)}
                    aria-pressed={selected}
                    className={`absolute w-12 h-20 rounded-md text-sm font-semibold transition-transform duration-300 ease-out
                                flex items-center justify-center shadow-md
                                ${
                                  selected
                                    ? "bg-accent text-white hover:bg-accent-hover"
                                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                }`}
                    style={{
                      left: "50%",
                      transform: `translateX(${
                        translateX - 50
                      }px) translateY(${arc}px) rotate(${rotate}deg)`,
                      zIndex: 1000 + index,
                      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = `translateX(${
                        translateX - 50
                      }px) translateY(${
                        arc - 20
                      }px) rotate(${rotate}deg) scale(1.05)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = `translateX(${
                        translateX - 50
                      }px) translateY(${arc}px) rotate(${rotate}deg)`;
                    }}
                  >
                    {card}
                  </button>
                );
              })}
            </div>
          </div>

          {/* live pill preview and Update button row (inside the same section) */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {selectedCards.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No cards selected
                </div>
              ) : (
                selectedCards
                  .slice()
                  .sort(
                    (a, b) =>
                      DEFAULT_CARDS.findIndex(
                        (card) => String(card) === String(a)
                      ) -
                      DEFAULT_CARDS.findIndex(
                        (card) => String(card) === String(b)
                      )
                  )
                  .map((c) => (
                    <div
                      key={String(c)}
                      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: `hsl(var(--accent))`,
                        color: `hsl(var(--accent-foreground))`
                      }}
                    >
                      {c}
                    </div>
                  ))
              )}
            </div>

            <div>
              <Button
                onClick={handleUpdateCards}
                disabled={loading || selectedCards.length < 1}
              >
                {loading ? "Updating..." : "Update Cards"}
              </Button>
            </div>
          </div>
        </section>

        {/* keep a small DialogFooter for other global actions if you like, otherwise remove */}
        <DialogFooter>
          {/* Intentionally left empty — primary action sits inside the cards section */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
