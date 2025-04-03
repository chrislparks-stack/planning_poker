import { useEffect, useState } from "react";

import { usePickCardMutation } from "@/api";
import { Card } from "@/components/Card";
import { useAuth } from "@/contexts";
import { useKeyboardControls } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UserCard } from "@/types";
import { getPickedUserCard } from "@/utils";

interface DeckProps {
  roomId: string;
  isGameOver: boolean;
  cards: string[];
  table: UserCard[] | undefined;
}

export function Deck({ roomId, isGameOver, cards, table }: DeckProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { cardsContainerRef } = useKeyboardControls();

  const [pickCardMutation] = usePickCardMutation({
    onError(error) {
      toast({
        title: "Error",
        description: `Pick card: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    const picked = getPickedUserCard(user?.id, table);
    setSelectedCard(picked?.card ?? null);
  }, [table, user?.id]);

  const handleCardClick = (card: string) => async () => {
    if (!user) return;

    const isSelected = selectedCard === card;
    const cardToSend = isSelected ? "" : card;

    await pickCardMutation({
      variables: {
        userId: user.id,
        roomId,
        card: cardToSend
      }
    });

    setSelectedCard(isSelected ? null : card);
  };

  return (
    <div className="flex justify-between items-end ml" ref={cardsContainerRef}>
      {cards.map((card) => {
        const isCardPicked = selectedCard === card;
        return (
          <div
            key={card}
            className={cn(
              "transition-margin-bottom duration-100 min-w-[5vw]",
              isCardPicked ? "mb-8" : "mb-0"
            )}
          >
            <Card
              onClick={handleCardClick(card)}
              variant={isCardPicked ? "default" : "outline"}
            >
              {card}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
