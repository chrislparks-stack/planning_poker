import { useEffect, useState } from "react";

import { usePickCardMutation } from "@/api";
import { Card } from "@/components/Card";
import { useAuth } from "@/contexts";
import { useKeyboardControls } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Room, User } from "@/types";

interface DeckProps {
  roomId: string;
  isGameOver: boolean;
  lockVotes: boolean;
  cards: string[];
  users: User[];
  previousRound?: Room["previousRound"];
}

export function Deck({
  roomId,
  isGameOver,
  lockVotes,
  cards,
  users,
  previousRound
}: DeckProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { cardsContainerRef } = useKeyboardControls();

  const currentUser = users.find((u) => u.id === authUser?.id) ?? null;
  const previousCard =
    previousRound?.votes.find((vote) => vote.userId === authUser?.id)?.card ??
    null;
  const votesLocked = isGameOver && lockVotes;
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

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
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resultsWidth = isGameOver ? 360 : 0;
  const shouldTwoRowLayout =
    cards.length > 5 && windowWidth < 250 + 75 * cards.length + resultsWidth;
  const cardsPerRow = shouldTwoRowLayout
    ? Math.ceil(cards.length / 2)
    : cards.length;

  useEffect(() => {
    const serverPick = currentUser?.lastCardPicked ?? null;
    setSelectedCard(serverPick);
  }, [authUser?.id, isGameOver, currentUser?.lastCardPicked]);

  const handleCardClick = (card: string) => async () => {
    if (!authUser?.id || votesLocked) return;
    const isSelected = selectedCard === card;
    const cardToSend = isSelected ? "" : card;
    setSelectedCard(isSelected ? null : card);

    try {
      const result = await pickCardMutation({
        variables: { userId: authUser.id, roomId, card: cardToSend }
      });
      const refreshedUser = result.data?.pickCard.users.find(
        (u) => u.id === authUser.id
      );
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
        shouldTwoRowLayout ? "grid" : "flex flex-nowrap"
      )}
      style={
        shouldTwoRowLayout
          ? {
              display: "grid",
              gridTemplateRows: "repeat(2, auto)",
              gridTemplateColumns: `repeat(${cardsPerRow}, minmax(min(5vw, 80px), 1fr))`,
              justifyContent: "center",
              alignContent: "end",
              gap: "3vw",
              paddingLeft: "5vw"
            }
          : {
              gap: "1.5vw"
            }
      }
    >
      {cards.map((card) => {
        const isPreviousVote = previousCard === card;
        const isSelected = selectedCard === card;
        return (
          <div
            key={card}
            className="relative flex justify-center transition-transform duration-200"
            style={{
              transform: isSelected ? "translateY(-15px)" : "translateY(0)"
            }}
          >
            {isPreviousVote && (
              <span className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-accent/80">
                Previous
              </span>
            )}
            <Card
              onClick={handleCardClick(card)}
              disabled={votesLocked}
              aria-pressed={isSelected}
              aria-label={`${card}${isPreviousVote ? ", previous vote" : ""}`}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                isPreviousVote &&
                  !isSelected &&
                  "border-dashed border-accent/65 bg-accent/[0.08] text-foreground/55 shadow-[0_0_16px_hsl(var(--accent)/0.16)] after:pointer-events-none after:absolute after:inset-1 after:rounded-[inherit] after:border after:border-accent/20",
                isPreviousVote &&
                  isSelected &&
                  "ring-2 ring-accent/45 ring-offset-2 ring-offset-background",
                votesLocked && "cursor-not-allowed opacity-75"
              )}
            >
              {card}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
