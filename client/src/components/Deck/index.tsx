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

  const { data: queryData, refetch } = useGetRoomQuery({ variables: { roomId } });
  const { data: subData } = useRoomSubscription({ variables: { roomId } });

  const room = subData?.room ?? queryData?.roomById ?? null;
  const currentUser = room?.users?.find((u) => u.id === authUser?.id) ?? null;
  const isGameOver = room?.isGameOver ?? isGameOverProp ?? false;

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

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
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const shouldTwoRowLayout = cards.length > 5 && windowWidth < (500 + 75 * cards.length);
  const cardsPerRow = shouldTwoRowLayout ? Math.ceil(cards.length / 2) : cards.length;

  useEffect(() => {
    const serverPick = currentUser?.lastCardPicked ?? null;
    setSelectedCard(serverPick);
  }, [room, authUser?.id, isGameOver]);

  const handleCardClick = (card: string) => async () => {
    if (!authUser?.id) return;
    const isSelected = selectedCard === card;
    const cardToSend = isSelected ? "" : card;
    setSelectedCard(isSelected ? null : card);

    try {
      await pickCardMutation({
        variables: { userId: authUser.id, roomId, card: cardToSend },
      });
      const result = await refetch({ roomId });
      const refreshedRoom = result?.data?.roomById ?? null;
      const refreshedUser = refreshedRoom?.users?.find((u: any) => u.id === authUser.id);
      setSelectedCard(refreshedUser?.lastCardPicked ?? null);
    } catch {
      setSelectedCard(isSelected ? card : null);
    }
  };

  return (
    <div
      ref={cardsContainerRef}
      className={cn(
        "items-end justify-center transition-[transform,opacity] duration-300",
        shouldTwoRowLayout
          ? "grid"
          : "flex flex-nowrap"
      )}
      style={
        shouldTwoRowLayout
          ? {
            display: "grid",
            gridTemplateRows: "repeat(2, auto)",
            gridTemplateColumns: `repeat(${cardsPerRow}, minmax(min(5vw, 80px), 1fr))`,
            justifyContent: "center",
            alignContent: "end",
            gap: "2vw",
            paddingLeft: "5vw"
          }
          : {
            gap: "1.5vw"
          }
      }
    >
      {cards.map((card) => {
        return (
          <div
            key={card}
            className="relative flex justify-center transition-transform duration-200"
            style={{
              transform: selectedCard === card ? "translateY(-15px)" : "translateY(0)",
            }}
          >
            <Card
              onClick={handleCardClick(card)}
              variant={selectedCard === card ? "default" : "outline"}
            >
              {card}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
