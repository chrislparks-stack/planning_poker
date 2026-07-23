import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, History } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const ARROW_PATHS = [
  { x: -29, drift: -7, distance: 52, delay: 0 },
  { x: 28, drift: 6, distance: 58, delay: 0.12 },
  { x: -6, drift: 10, distance: 68, delay: 0.24 }
] as const;

const DIRECTION_COLOR_CLASSES = {
  up: "text-emerald-700 dark:text-emerald-400 [.starry_&]:text-emerald-400",
  down: "text-rose-700 dark:text-rose-400 [.starry_&]:text-rose-400",
  changed: "text-glass"
} as const;

interface VoteAdjustmentProps {
  currentCard?: string | null;
  currentValue?: number | null;
  previousCard?: string | null;
  previousValue?: number | null;
}

type VoteDirection = keyof typeof DIRECTION_COLOR_CLASSES;
type BurstDirection = Exclude<VoteDirection, "changed">;

interface VoteAdjustmentBurstProps {
  direction: BurstDirection;
  eventId: string;
}

interface VoteSelection {
  card?: string | null;
  value?: number | null;
}

interface VoteBurst {
  direction: BurstDirection;
  eventId: string;
}

function getVoteDirection(
  currentValue?: number | null,
  previousValue?: number | null
): VoteDirection {
  if (currentValue == null || previousValue == null) return "changed";
  if (currentValue > previousValue) return "up";
  if (currentValue < previousValue) return "down";
  return "changed";
}

function LongDirectionArrow({ direction }: { direction: BurstDirection }) {
  const path =
    direction === "up"
      ? "M8 26V3 M2.5 8.5 8 3l5.5 5.5"
      : "M8 2v23 M2.5 19.5 8 25l5.5-5.5";

  return (
    <svg
      viewBox="0 0 16 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-4"
      data-vote-adjustment-arrow-icon={direction}
    >
      <path d={path} />
    </svg>
  );
}

function VoteAdjustmentBurst({ direction, eventId }: VoteAdjustmentBurstProps) {
  const initialY = direction === "up" ? 24 : -24;
  const directionMultiplier = direction === "up" ? -1 : 1;

  return (
    <div
      key={eventId}
      aria-hidden="true"
      data-vote-adjustment-burst={direction}
      className={cn(
        "pointer-events-none absolute inset-0 z-40 overflow-visible",
        direction === "down" && "-translate-y-3"
      )}
    >
      {ARROW_PATHS.map(({ x, drift, distance, delay }, index) => (
        <motion.span
          key={`${eventId}-${index}`}
          data-vote-adjustment-arrow={direction}
          initial={{ x, y: initialY, opacity: 0, scale: 0.55 }}
          animate={{
            x: [x, x + drift, x + drift / 2],
            y: directionMultiplier * distance,
            opacity: [0, 0.95, 0.8, 0],
            scale: [0.55, 1, 0.8]
          }}
          transition={{
            duration: 1.4 + index * 0.1,
            delay,
            ease: "easeOut"
          }}
          className={cn(
            "absolute left-1/2 top-1/2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
            DIRECTION_COLOR_CLASSES[direction]
          )}
        >
          <LongDirectionArrow direction={direction} />
        </motion.span>
      ))}
    </div>
  );
}

export function VoteAdjustment({
  currentCard,
  currentValue,
  previousCard,
  previousValue
}: VoteAdjustmentProps) {
  const priorSelectionRef = useRef<VoteSelection>({
    card: currentCard,
    value: currentValue
  });
  const burstSequenceRef = useRef(0);
  const [burst, setBurst] = useState<VoteBurst | null>(null);

  useEffect(() => {
    const priorSelection = priorSelectionRef.current;
    priorSelectionRef.current = { card: currentCard, value: currentValue };

    if (
      !previousCard ||
      !currentCard ||
      !priorSelection.card ||
      priorSelection.card === currentCard
    ) {
      return;
    }

    const direction = getVoteDirection(currentValue, priorSelection.value);
    if (direction === "changed") {
      setBurst(null);
      return;
    }

    burstSequenceRef.current += 1;
    setBurst({
      direction,
      eventId: `${priorSelection.card}-${currentCard}-${burstSequenceRef.current}`
    });
  }, [currentCard, currentValue, previousCard]);

  const direction = getVoteDirection(currentValue, previousValue);
  const accessibleDirection =
    direction === "up"
      ? "increased"
      : direction === "down"
      ? "decreased"
      : "changed";
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : History;
  const showOriginalChange =
    Boolean(currentCard) &&
    Boolean(previousCard) &&
    currentCard !== previousCard;

  return (
    <>
      {burst && (
        <VoteAdjustmentBurst
          key={burst.eventId}
          direction={burst.direction}
          eventId={burst.eventId}
        />
      )}
      {showOriginalChange && (
        <div
          role="status"
          aria-label={`Vote ${accessibleDirection} from ${previousCard} to ${currentCard}`}
          title={`Vote ${accessibleDirection} from ${previousCard} to ${currentCard}`}
          className={cn(
            "pointer-events-none absolute inset-x-0 top-[22px] z-10 flex items-center justify-center gap-0.5 whitespace-nowrap text-[8px] font-bold leading-none tracking-[0.06em] uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
            DIRECTION_COLOR_CLASSES[direction]
          )}
          data-vote-adjustment={direction}
        >
          <Icon aria-hidden="true" className="size-2.5" strokeWidth={2.5} />
          <span>was {previousCard}</span>
        </div>
      )}
    </>
  );
}
