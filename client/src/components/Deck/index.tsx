import { useEffect, useState } from "react";

import {
  useGetRoomQuery,
  useRoomSubscription,
  usePickCardMutation,
} from "@/api";
import { Card } from "@/components/Card";
import { useAuth } from "@/contexts";
import { useKeyboardControls } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UserCard } from "@/types";

interface DeckProps {
  roomId: string;
  isGameOver?: boolean;
  cards: string[];
  table: UserCard[] | undefined;
}

export function Deck({ roomId, isGameOver: isGameOverProp, cards }: DeckProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { cardsContainerRef } = useKeyboardControls();

  // query + subscription
  const { data: queryData, refetch } = useGetRoomQuery({
    variables: { roomId },
  });

  const { data: subData } = useRoomSubscription({
    variables: { roomId },
  });

  // authoritative room (subscription preferred)
  const room = subData?.room ?? queryData?.roomById ?? null;

  // find the current user object in the authoritative room
  const currentUser = room?.users?.find((u) => u.id === authUser?.id) ?? null;

  // authoritative isGameOver from server if present
  const isGameOver = room?.isGameOver ?? isGameOverProp ?? false;

  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const [pickCardMutation] = usePickCardMutation({
    onError(error) {
      toast({
        title: "Error",
        description: `Pick card: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const serverPick = currentUser?.lastCardPicked ?? null;

    setSelectedCard(serverPick);
  }, [room, authUser?.id, isGameOver]);

  const handleCardClick = (card: string) => async () => {
    if (!authUser?.id) return;

    const isSelected = selectedCard === card;
    const cardToSend = isSelected ? "" : card;

    // optimistic UI update
    setSelectedCard(isSelected ? null : card);

    try {
      await pickCardMutation({
        variables: {
          userId: authUser.id,
          roomId,
          card: cardToSend,
        },
      });

      try {
        const result = await refetch({ roomId });
        const refreshedRoom = result?.data?.roomById ?? null;
        const refreshedUser = refreshedRoom?.users?.find((u: any) => u.id === authUser.id) ?? null;
        const authoritativePick = refreshedUser?.lastCardPicked ?? null;

        setSelectedCard(authoritativePick);
      } catch {
        // If refetch fails, we keep the optimistic state. Subscription will typically reconcile soon.
      }
    } catch (err) {
      // revert optimistic change on error
      setSelectedCard(isSelected ? card : null);
      // mutation onError already shows toast
    }
  };

  return (
    <div className="flex justify-between items-end ml" ref={cardsContainerRef}>
      {cards.map((card) => {
        const isCardPicked = selectedCard === card;
        return (
          <div
            key={String(card)}
            className={cn(
              "transition-margin-bottom duration-100 min-w-[5vw] max-w-[80px]",
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
