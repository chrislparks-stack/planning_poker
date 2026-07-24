import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useSendReactionMutation } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReactionKind } from "@/types";

const REACTIONS = [
  { kind: ReactionKind.Celebrate, emoji: "🎉", label: "Celebrate" },
  { kind: ReactionKind.Heart, emoji: "❤️", label: "Love it" },
  { kind: ReactionKind.ThumbsUp, emoji: "👍", label: "Thumbs up" },
  { kind: ReactionKind.Laugh, emoji: "😂", label: "Laugh" },
  { kind: ReactionKind.Confused, emoji: "❓", label: "Question" },
  { kind: ReactionKind.RaiseHand, emoji: "✋", label: "Raise hand" }
] as const;

const CONFETTI_VECTORS = [
  { x: -42, y: -48, rotate: -35 },
  { x: -24, y: -62, rotate: 24 },
  { x: 0, y: -68, rotate: -18 },
  { x: 26, y: -60, rotate: 38 },
  { x: 44, y: -42, rotate: -28 },
  { x: -48, y: -18, rotate: 42 },
  { x: 48, y: -12, rotate: -44 },
  { x: -32, y: 16, rotate: 28 },
  { x: 32, y: 18, rotate: -24 },
  { x: 0, y: 24, rotate: 36 }
] as const;

const CONFETTI_COLORS = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];
const QUESTION_PATHS = [
  { x: -24, drift: 7, y: -54, delay: 0 },
  { x: 18, drift: -8, y: -64, delay: 0.12 },
  { x: -6, drift: 9, y: -76, delay: 0.24 },
  { x: 30, drift: -6, y: -46, delay: 0.34 }
] as const;
const FLOATING_HEARTS = [
  { x: -26, drift: -8, delay: 0 },
  { x: 22, drift: 9, delay: 0.14 },
  { x: -4, drift: 7, delay: 0.27 }
] as const;
const FLOATING_THUMBS = [
  { x: -24, drift: -7, delay: 0.08 },
  { x: 20, drift: 8, delay: 0.22 }
] as const;

interface QuickReactionPickerProps {
  roomId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  openBelow: boolean;
  onMenuEnter: () => void;
  onMenuLeave: () => void;
  handRaised: boolean;
}

interface PickerPosition {
  caretLeft: number;
  left: number;
  top: number;
  opensBelow: boolean;
}

const PICKER_WIDTH = 208;
const PICKER_HEIGHT = 57;
const CARD_HEIGHT = 96;
const PICKER_GAP = 8;

export function QuickReactionPicker({
  roomId,
  userId,
  open,
  onClose,
  openBelow,
  onMenuEnter,
  onMenuLeave,
  handRaised
}: QuickReactionPickerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const { toast } = useToast();
  const [sendReaction, { loading }] = useSendReactionMutation({
    onError: (error) => {
      toast({
        title: "Reaction failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;

      const anchorCenter = anchor.left;
      const maxLeft = Math.max(
        PICKER_GAP,
        window.innerWidth - PICKER_WIDTH - PICKER_GAP
      );
      const left = Math.min(
        Math.max(anchorCenter - PICKER_WIDTH / 2, PICKER_GAP),
        maxLeft
      );
      const opensBelow =
        openBelow || anchor.top < PICKER_HEIGHT + PICKER_GAP * 2;
      const top = opensBelow
        ? anchor.top + CARD_HEIGHT + PICKER_GAP
        : anchor.top - PICKER_HEIGHT - PICKER_GAP;

      setPosition({
        caretLeft: Math.min(
          Math.max(anchorCenter - left, 12),
          PICKER_WIDTH - 12
        ),
        left,
        top,
        opensBelow
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, openBelow]);

  const react = async (reaction: ReactionKind) => {
    onClose();
    await sendReaction({ variables: { roomId, userId, reaction } });
  };

  const picker = (
    <AnimatePresence>
      {open && position && (
        <motion.div
          role="menu"
          aria-label="Story point reactions"
          initial={{
            opacity: 0,
            scale: 0.94,
            y: position.opensBelow ? -5 : 5
          }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.96,
            y: position.opensBelow ? -4 : 4
          }}
          onMouseEnter={onMenuEnter}
          onMouseLeave={onMenuLeave}
          style={{ left: position.left, top: position.top, zIndex: 200 }}
          className={cn(
            "reaction-picker fixed w-52 rounded-xl px-2 py-1.5 backdrop-blur-md",
            position.opensBelow ? "origin-top" : "origin-bottom"
          )}
        >
          <div className="mb-1 flex items-center gap-1 px-0.5">
            <Sparkles className="reaction-picker-label h-2.5 w-2.5" />
            <span className="reaction-picker-label text-[7px] font-bold uppercase tracking-[0.14em]">
              Quick reactions
            </span>
            <span className="reaction-picker-rule h-px min-w-2 flex-1" />
          </div>
          <div className="flex items-center justify-between gap-1">
            {REACTIONS.map(({ kind, emoji, label }) => {
              const selected = kind === ReactionKind.RaiseHand && handRaised;

              return (
                <button
                  key={kind}
                  type="button"
                  role={
                    kind === ReactionKind.RaiseHand
                      ? "menuitemcheckbox"
                      : "menuitem"
                  }
                  aria-label={selected ? "Lower hand" : label}
                  aria-checked={
                    kind === ReactionKind.RaiseHand ? selected : undefined
                  }
                  title={selected ? "Lower hand" : label}
                  disabled={loading}
                  data-selected={selected || undefined}
                  className="reaction-picker-item flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  onClick={() => void react(kind)}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <span
            data-side={position.opensBelow ? "top" : "bottom"}
            className={cn(
              "reaction-picker-caret absolute h-2 w-2 -translate-x-1/2 rotate-45",
              position.opensBelow ? "-top-1" : "-bottom-1"
            )}
            style={{ left: position.caretLeft }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div ref={anchorRef} className="absolute left-1/2 top-0 h-0 w-0" />
      {typeof document !== "undefined"
        ? createPortal(picker, document.body)
        : null}
    </>
  );
}

interface PlayerReactionBurstProps {
  eventId: string;
  reaction: ReactionKind;
}

function ConfettiAnimation({ eventId }: { eventId: string }) {
  return (
    <>
      <motion.span
        initial={{ opacity: 0, scale: 0.45, y: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.45, 1.4, 1.1, 0.8],
          y: -24
        }}
        transition={{ duration: 1.35, ease: "easeOut" }}
        className="absolute -left-3 -top-3 text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.75)]"
      >
        🎉
      </motion.span>
      {CONFETTI_VECTORS.map((vector, index) => (
        <motion.span
          key={`${eventId}-confetti-${index}`}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.5, rotate: 0 }}
          animate={{
            x: vector.x,
            y: vector.y,
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 0.9],
            rotate: vector.rotate
          }}
          transition={{
            duration: 1.15 + (index % 3) * 0.12,
            delay: index * 0.025,
            ease: "easeOut"
          }}
          className="absolute block h-1.5 w-1 rounded-[1px]"
          style={{
            backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length]
          }}
        />
      ))}
    </>
  );
}

function ConfusedAnimation({ eventId }: { eventId: string }) {
  return (
    <>
      <motion.span
        initial={{ opacity: 0, scale: 0.4, x: 0, y: 8, rotate: -12 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.4, 1.25, 1, 0.9],
          x: [0, -5, 4, -2],
          y: [8, -8, -18, -28],
          rotate: [-12, 10, -8, 5]
        }}
        transition={{ duration: 1.75, ease: "easeInOut" }}
        className="absolute -left-3 -top-3 text-2xl drop-shadow-[0_0_9px_hsl(var(--accent)/0.8)]"
      >
        ❓
      </motion.span>
      {QUESTION_PATHS.map(({ x, drift, y, delay }, index) => (
        <motion.span
          key={`${eventId}-question-${index}`}
          initial={{ x, y: 4, opacity: 0, scale: 0.55 }}
          animate={{
            x: [x, x + drift, x - drift / 2],
            y,
            opacity: [0, 0.9, 0.8, 0],
            scale: [0.55, 1, 0.85]
          }}
          transition={{ duration: 1.45, delay, ease: "easeInOut" }}
          className="absolute -left-1.5 -top-2 text-base font-black text-accent drop-shadow-[0_0_5px_hsl(var(--accent)/0.7)]"
        >
          ?
        </motion.span>
      ))}
    </>
  );
}

function HeartAnimation({ eventId }: { eventId: string }) {
  return (
    <>
      <motion.span
        initial={{ opacity: 0, scale: 0.25, y: 8 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.25, 1.35, 1, 1.16, 0.9],
          y: [8, -8, -13, -13, -24]
        }}
        transition={{ duration: 1.55, ease: "easeOut" }}
        className="absolute -left-4 -top-4 text-3xl drop-shadow-[0_0_10px_rgba(251,113,133,0.9)]"
      >
        ❤️
      </motion.span>
      {FLOATING_HEARTS.map(({ x, drift, delay }, index) => (
        <motion.span
          key={`${eventId}-heart-${index}`}
          initial={{ x, y: 4, opacity: 0, scale: 0.45 }}
          animate={{
            x: [x, x + drift, x - drift / 2],
            y: -58 - index * 7,
            opacity: [0, 0.95, 0.8, 0],
            scale: [0.45, 0.9, 0.7]
          }}
          transition={{ duration: 1.45, delay, ease: "easeOut" }}
          className="absolute -left-2 -top-2 text-base drop-shadow-[0_0_6px_rgba(251,113,133,0.75)]"
        >
          ♥
        </motion.span>
      ))}
    </>
  );
}

function LaughAnimation({ eventId }: { eventId: string }) {
  return (
    <>
      <motion.span
        initial={{ opacity: 0, scale: 0.35, y: 10, rotate: -12 }}
        animate={{
          opacity: [0, 1, 1, 1, 0],
          scale: [0.35, 1.35, 1, 1.08, 0.9],
          y: [10, -8, -16, -13, -24],
          rotate: [-12, 10, -8, 7, 0]
        }}
        transition={{ duration: 1.55, ease: "easeInOut" }}
        className="absolute -left-4 -top-4 text-3xl drop-shadow-[0_0_10px_rgba(96,165,250,0.85)]"
      >
        😂
      </motion.span>
      {[-1, 1].map((direction, index) => (
        <motion.span
          key={`${eventId}-tear-${direction}`}
          initial={{ x: direction * 8, y: -8, opacity: 0, scale: 0.4 }}
          animate={{
            x: direction * (24 + index * 4),
            y: 20 + index * 7,
            opacity: [0, 1, 0],
            scale: [0.4, 0.9, 0.65]
          }}
          transition={{ duration: 1.05, delay: 0.3 + index * 0.1 }}
          className="absolute -left-1 -top-2 text-sm"
        >
          💧
        </motion.span>
      ))}
    </>
  );
}

function ThumbsUpAnimation({ eventId }: { eventId: string }) {
  return (
    <>
      <motion.span
        initial={{ opacity: 0, scale: 0.25, y: 10, rotate: -14 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.25, 1.4, 1.05, 0.9],
          y: [10, -8, -16, -28],
          rotate: [-14, 8, -4, 0]
        }}
        transition={{ duration: 1.55, ease: "easeOut" }}
        className="absolute -left-4 -top-4 text-3xl drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
      >
        👍
      </motion.span>
      {FLOATING_THUMBS.map(({ x, drift, delay }, index) => (
        <motion.span
          key={`${eventId}-thumb-${index}`}
          initial={{ x, y: 3, opacity: 0, scale: 0.4 }}
          animate={{
            x: [x, x + drift, x - drift / 2],
            y: -48 - index * 9,
            opacity: [0, 0.95, 0.8, 0],
            scale: [0.4, 0.85, 0.65]
          }}
          transition={{ duration: 1.35, delay, ease: "easeOut" }}
          className="absolute -left-2 -top-2 text-base drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]"
        >
          👍
        </motion.span>
      ))}
    </>
  );
}

function RaiseHandAnimation() {
  return (
    <>
      <motion.span
        initial={{ opacity: 0, scale: 0.35, y: 8, rotate: -20 }}
        animate={{
          opacity: [0, 1, 1, 1, 0],
          scale: [0.35, 1.35, 1, 1.08, 0.9],
          y: [8, -10, -18, -18, -26],
          rotate: [-20, 18, -14, 10, 0]
        }}
        transition={{ duration: 1.65, ease: "easeInOut" }}
        className="absolute -left-4 -top-4 text-3xl drop-shadow-[0_0_10px_hsl(var(--accent)/0.85)]"
      >
        ✋
      </motion.span>
      {[0, 0.2].map((delay) => (
        <motion.span
          key={delay}
          initial={{ opacity: 0.6, scale: 0.25 }}
          animate={{ opacity: [0.6, 0.25, 0], scale: [0.25, 1, 1.35] }}
          transition={{ duration: 1.05, delay, ease: "easeOut" }}
          className="absolute -left-5 -top-5 h-10 w-10 rounded-full border border-accent/70 shadow-[0_0_9px_hsl(var(--accent)/0.55)]"
        />
      ))}
    </>
  );
}

export function PlayerReactionBurst({
  eventId,
  reaction
}: PlayerReactionBurstProps) {
  const animation =
    reaction === ReactionKind.Celebrate
      ? "confetti"
      : reaction === ReactionKind.Confused
      ? "floating-questions"
      : reaction === ReactionKind.Heart
      ? "floating-hearts"
      : reaction === ReactionKind.ThumbsUp
      ? "thumbs-up-pop"
      : reaction === ReactionKind.Laugh
      ? "laugh-bounce"
      : "raised-hand-wave";

  return (
    <div
      key={eventId}
      data-reaction-burst={reaction}
      data-reaction-animation={animation}
      className="pointer-events-none absolute left-1/2 top-1/2 z-[75] h-0 w-0"
      aria-hidden="true"
    >
      {reaction === ReactionKind.Celebrate && (
        <ConfettiAnimation eventId={eventId} />
      )}
      {reaction === ReactionKind.Confused && (
        <ConfusedAnimation eventId={eventId} />
      )}
      {reaction === ReactionKind.Heart && <HeartAnimation eventId={eventId} />}
      {reaction === ReactionKind.ThumbsUp && (
        <ThumbsUpAnimation eventId={eventId} />
      )}
      {reaction === ReactionKind.Laugh && <LaughAnimation eventId={eventId} />}
      {reaction === ReactionKind.RaiseHand && <RaiseHandAnimation />}
    </div>
  );
}

export { REACTIONS };
