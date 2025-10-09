import { FC, useEffect, useState } from "react";

import { useUpdateDeckMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {useToast} from "@/hooks/use-toast.ts";
import { Room } from "@/types";

interface EditCardsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  room?: Room;
}

const DEFAULT_CARDS = [0, 0.5, 1, 2, 3, 5, 8, 13, 21, "?", "☕"];

export const EditCardsDialog: FC<EditCardsDialogProps> = ({
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

  const handleSubmit = async () => {
    if (selectedCards.length > 0) {
      const sortedSelectedCards = [...selectedCards].sort(
        (a, b) =>
          DEFAULT_CARDS.findIndex((card) => String(card) === String(a)) -
          DEFAULT_CARDS.findIndex((card) => String(card) === String(b))
      );

      await updateDeck({
        variables: {
          input: {
            roomId,
            cards: sortedSelectedCards.map(String)
          }
        }
      });

      if (localStorage.getItem("Room")) {
        const stored = localStorage.getItem("Room");
        let roomData;

        try {
          roomData = stored ? JSON.parse(stored) : null;
        } catch {
          console.error("Failed to parse Room from localStorage");
          roomData = null;
        }

        if (roomData) {
          roomData.Cards = sortedSelectedCards;
          localStorage.setItem("Room", JSON.stringify(roomData));
        }
      }
    }

    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Prevent closing if user clicks outside or presses ESC
        if (!nextOpen && selectedCards.length < 1) {
          toast({
            title: "Cannot Exit",
            description: "Please select at least one card",
            variant: "destructive"
          });
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <DialogContent
        className="sm:max-w-[525px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Select New Cards</DialogTitle>
          <DialogDescription>
            Choose new card set you want to use. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-48 w-full overflow-visible">
          <p className="mb-2">Pick poker cards to use:</p>
          <div className="flex justify-center items-baseline">
            {DEFAULT_CARDS.map((card, index) => {
              const total = DEFAULT_CARDS.length;
              const middle = (total - 1) / 2;
              const offset = index - middle;

              const rotate = offset * 5.5;
              const spacing = 42;
              const translateX = offset * spacing;

              const arcStrength = 2.2;
              const arc = Math.pow(offset, 2) * arcStrength;

              return (
                <button
                  key={card}
                  onClick={() => toggleCardSelection(card)}
                  className={`absolute w-12 h-20 rounded-md text-sm font-semibold transition-transform duration-300 ease-out
                                flex items-center justify-center shadow-md
                                ${
                                  selectedCards.includes(String(card))
                                    ? "bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
                                    : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                                }`}
                  style={{
                    transform: `translateX(${translateX}px) translateY(${arc}px) rotate(${rotate}deg)`,
                    zIndex: 1000 + index,
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)" // 💫 subtle depth
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `translateX(${translateX}px) translateY(${
                      arc - 20
                    }px) rotate(${rotate}deg) scale(1.05)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `translateX(${translateX}px) translateY(${arc}px) rotate(${rotate}deg)`;
                  }}
                >
                  {card}
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedCards.length < 1}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
