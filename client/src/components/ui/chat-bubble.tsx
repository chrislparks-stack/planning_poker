import React, { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  playerId: string;
  senderName?: string;
  absolutePosition?: { x: number; y: number; width?: number; height?: number };
  duration?: number; // seconds bubble is alive/animating
  className?: string;
  onExpire?: (playerId: string) => void;
  onShowInChat?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  playerId,
  senderName,
  absolutePosition,
  duration = 5,
  className,
  onExpire,
  onShowInChat,
}) => {
  const [visible, setVisible] = useState(true);
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: -9999,
    y: -9999,
  });

  const bubbleRef = useRef<HTMLDivElement>(null);

  // -- your original positioning logic, untouched --
  const computeAndSetCoords = () => {
    if (!absolutePosition) return;
    const el = bubbleRef.current;
    if (!el) return;

    const { x, y, width = 0} = absolutePosition;
    const bubbleRect = el.getBoundingClientRect();

    const bubbleWidth = Math.max(1, bubbleRect.width || 160);
    const bubbleHeight = Math.max(1, bubbleRect.height || 60);

    // center horizontally, position bubble bottom at card top
    const baseX = x + width / 2 - bubbleWidth / 2;
    const baseY = y - bubbleHeight;

    // clamp so we don't go off-screen
    const margin = 8;
    const clampedX = Math.min(
      Math.max(baseX, margin),
      window.innerWidth - bubbleWidth - margin
    );
    const clampedY = Math.min(
      Math.max(baseY, margin),
      window.innerHeight - bubbleHeight - margin
    );

    setCoords({ x: clampedX, y: clampedY });
  };

  // measure after mount + when message / position changes
  useLayoutEffect(() => {
    if (!absolutePosition) return;

    // 2 RAFs so DOM + imgs render before we grab size
    requestAnimationFrame(() => {
      requestAnimationFrame(computeAndSetCoords);
    });

    // handle bubble resize (GIF loads etc.)
    const el = bubbleRef.current;
    let ro: ResizeObserver | undefined;
    if (el && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => computeAndSetCoords());
      ro.observe(el);
    }

    // if images load later, reposition
    const imgs = el?.querySelectorAll?.("img") ?? [];
    const offs: Array<() => void> = [];
    imgs.forEach((img) => {
      if ((img as HTMLImageElement).complete) return;
      const onLoad = () => computeAndSetCoords();
      img.addEventListener("load", onLoad, { once: true });
      offs.push(() => img.removeEventListener("load", onLoad));
    });

    // keep in place on viewport change
    const onWin = () => computeAndSetCoords();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);

    return () => {
      ro?.disconnect();
      offs.forEach((off) => off());
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [message, absolutePosition]);

  // auto-expire same as before, just using new duration
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // give exit anim a beat before cleanup
      setTimeout(() => onExpire?.(playerId), 300);
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [duration, playerId, onExpire]);

  if (!visible) return null;

  // NOTE: we are STILL rendering one fixed, positioned motion.div.
  // No extra relative wrapper around it. So positioning stays correct.
  const bubble = (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={bubbleRef}
          key={message}
          initial={{ opacity: 0, y: 0, scale: 0.96 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [0, -35],
            scale: [0.96, 1],
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration,
            ease: "easeInOut",
            opacity: { times: [0, 0.1, 0.9, 1], duration },
            y: { duration, ease: "easeInOut" },
          }}
          className={cn(
            // IMPORTANT: keep this fixed so computeAndSetCoords math applies to viewport
            "fixed z-[9999] select-none pointer-events-auto group",
            "px-3.5 py-2 text-sm rounded-2xl font-medium tracking-tight",
            "overflow-hidden break-words text-center",
            "backdrop-blur-[22px] border shadow-[0_2px_18px_rgba(0,0,0,0.25)]",
            // glass body
            "bg-gradient-to-br from-accent/25 via-background/30 to-accent/10 border-white/15",
            // images stay contained
            "[&>img]:block [&>img]:mx-auto [&>img]:my-1.5",
            "[&>img]:max-w-[220px] [&>img]:max-h-[120px] [&>img]:rounded-xl [&>img]:object-contain",
            "[&>img]:shadow-md [&>img]:border [&>img]:border-white/20",
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
            transform: "translate(0, -100%)",
            maxWidth: "180px",
            maxHeight: "150px",
            // kill scrollbars: hide overflow visually instead of scroll
            overflow: "hidden",
          }}
        >
          {senderName && (
            <div className="text-[11px] font-semibold text-foreground/90 dark:text-accent-foreground/90 underline decoration-foreground/40 decoration-1">
              {senderName}
            </div>
          )}
          {/* message content */}
          <div
            className={cn(
              "text-[13px] leading-snug",
              // same readable contrast trick you had
              "text-foreground-soft dark:text-accent-foreground"
            )}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: message }}
          />

          {/* hover-to-reveal overlay */}
          <button
            type="button"
            onClick={onShowInChat}
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "text-[11px] font-semibold rounded-2xl",
              "bg-background/80 text-accent-foreground border border-accent/40",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              "backdrop-blur-[6px] cursor-pointer"
            )}
            style={{
              pointerEvents: "auto",
            }}
          >
            Show in Chat
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(bubble, document.body);
};
