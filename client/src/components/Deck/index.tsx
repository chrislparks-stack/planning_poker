import { useEffect, useLayoutEffect, useState } from "react";

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

const CARD_MIN_WIDTH = 52;
const DECK_INLINE_BUFFER = 16;
const MIN_CARD_GAP = 12;
const MAX_CARD_GAP = 44;
const MAX_WRAPPED_CARD_GAP = 64;

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
  const [singleRowCardsWidth, setSingleRowCardsWidth] = useState(
    () => cards.length * CARD_MIN_WIDTH
  );
  const [visibleWidth, setVisibleWidth] = useState(() => window.innerWidth);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

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
    const deckContainer = cardsContainerRef.current?.parentElement;
    if (!deckContainer) return;
    const visibleWorkspace =
      deckContainer.closest<HTMLElement>('[aria-label="Room workspace"]') ??
      deckContainer;

    const updateAvailableWidth = () => {
      setVisibleWidth(visibleWorkspace.getBoundingClientRect().width);
      setViewportWidth(window.innerWidth);
    };

    updateAvailableWidth();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateAvailableWidth);
    observer?.observe(visibleWorkspace);
    window.addEventListener("resize", updateAvailableWidth);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateAvailableWidth);
    };
  }, [cardsContainerRef]);

  useLayoutEffect(() => {
    const deck = cardsContainerRef.current;
    const visibleWorkspace =
      deck?.closest<HTMLElement>('[aria-label="Room workspace"]') ??
      deck?.parentElement;
    if (!deck || !visibleWorkspace) return;

    const workspaceWidth = visibleWorkspace.getBoundingClientRect().width;
    const cardWidths = Array.from(
      deck.children,
      (card) => card.getBoundingClientRect().width
    );
    const isSyntheticUniformMeasurement = cardWidths.every(
      (width) => Math.abs(width - workspaceWidth) < 1
    );
    if (isSyntheticUniformMeasurement) return;

    const measuredCardsWidth = cardWidths.reduce(
      (total, width) => total + width,
      0
    );
    if (
      measuredCardsWidth > 0 &&
      Math.abs(measuredCardsWidth - singleRowCardsWidth) >= 0.25
    ) {
      setSingleRowCardsWidth(measuredCardsWidth);
    }
  }, [cards, cardsContainerRef, singleRowCardsWidth]);

  const resultsWidth = isGameOver ? 320 : 0;
  const preferredCardGap = Math.min(
    MAX_CARD_GAP,
    Math.max(MIN_CARD_GAP, viewportWidth * 0.03)
  );
  const gapCount = Math.max(cards.length - 1, 0);
  const fixedSingleRowWidth =
    singleRowCardsWidth + resultsWidth + DECK_INLINE_BUFFER;
  const minimumSingleRowWidth = fixedSingleRowWidth + gapCount * MIN_CARD_GAP;
  const shouldTwoRowLayout =
    cards.length > 5 && visibleWidth < minimumSingleRowWidth;
  const cardsPerRow = shouldTwoRowLayout
    ? Math.ceil(cards.length / 2)
    : cards.length;
  const maximumFittingSingleRowGap =
    gapCount > 0
      ? (visibleWidth - fixedSingleRowWidth) / gapCount
      : preferredCardGap;
  const singleRowGap = Math.min(
    preferredCardGap,
    Math.max(MIN_CARD_GAP, maximumFittingSingleRowGap)
  );
  const wrappedGapCount = Math.max(cardsPerRow - 1, 0);
  const fixedWrappedRowWidth =
    cardsPerRow * CARD_MIN_WIDTH + resultsWidth + DECK_INLINE_BUFFER;
  const maximumFittingWrappedGap =
    wrappedGapCount > 0
      ? (visibleWidth - fixedWrappedRowWidth) / wrappedGapCount
      : preferredCardGap;
  const wrappedCardGap = Math.min(
    MAX_WRAPPED_CARD_GAP,
    Math.max(MIN_CARD_GAP, maximumFittingWrappedGap)
  );
  const cardGap = shouldTwoRowLayout ? wrappedCardGap : singleRowGap;

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
      data-layout={shouldTwoRowLayout ? "two-row" : "single-row"}
      data-gap-mode={
        shouldTwoRowLayout
          ? wrappedCardGap === MIN_CARD_GAP
            ? "wrapped-minimum"
            : wrappedCardGap === MAX_WRAPPED_CARD_GAP
            ? "wrapped-maximum"
            : "wrapped-fluid"
          : singleRowGap < preferredCardGap
          ? "compressed"
          : "preferred"
      }
      className={cn(
        "shrink-0 items-end justify-center transition-[transform,opacity] duration-300",
        shouldTwoRowLayout ? "grid" : "flex flex-nowrap"
      )}
      style={
        shouldTwoRowLayout
          ? {
              display: "grid",
              gridTemplateRows: "repeat(2, auto)",
              gridTemplateColumns: `repeat(${cardsPerRow}, ${CARD_MIN_WIDTH}px)`,
              justifyContent: "center",
              alignContent: "end",
              columnGap: `${cardGap}px`,
              rowGap: "clamp(1rem, 2.5vh, 2rem)"
            }
          : {
              gap: `${cardGap}px`
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
