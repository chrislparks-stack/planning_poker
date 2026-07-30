import { motion, AnimatePresence } from "framer-motion";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  playerId: string;
  senderName?: string;
  duration?: number;
  className?: string;
  onExpire?: (playerId: string) => void;
  onShowInChat?: () => void;
  anchorRect?: DOMRect;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  playerId,
  senderName,
  duration = 5,
  className,
  onExpire,
  onShowInChat,
  anchorRect
}) => {
  const [visible, setVisible] = useState(true);
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: -9999,
    y: -9999
  });

  const bubbleRef = useRef<HTMLDivElement>(null);

  const anchorLeft = anchorRect?.left;
  const anchorTop = anchorRect?.top;
  const anchorWidth = anchorRect?.width;

  const computeAndSetCoords = useCallback(() => {
    const el = bubbleRef.current;
    if (
      !el ||
      anchorLeft === undefined ||
      anchorTop === undefined ||
      anchorWidth === undefined
    )
      return;

    const bubbleRect = el.getBoundingClientRect();
    const bubbleWidth = Math.max(1, bubbleRect.width || 160);
    const bubbleHeight = Math.max(1, bubbleRect.height || 60);

    // anchor: top-center of player card
    const x = anchorLeft + anchorWidth / 2;
    const y = anchorTop;

    const baseX = x - bubbleWidth / 2;
    const baseY = y - bubbleHeight - 8;

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
  }, [anchorLeft, anchorTop, anchorWidth]);

  useLayoutEffect(() => {
    if (anchorLeft === undefined) return;

    requestAnimationFrame(() => requestAnimationFrame(computeAndSetCoords));

    const onWin = () => computeAndSetCoords();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);

    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [message, anchorLeft, computeAndSetCoords]);

  useLayoutEffect(() => {
    if (!anchorRect) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(computeAndSetCoords);
    });

    const el = bubbleRef.current;
    let ro: ResizeObserver | undefined;
    if (el && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => computeAndSetCoords());
      ro.observe(el);
    }

    const imgs = el?.querySelectorAll?.("img") ?? [];
    const offs: Array<() => void> = [];
    imgs.forEach((img) => {
      if ((img as HTMLImageElement).complete) return;
      const onLoad = () => computeAndSetCoords();
      img.addEventListener("load", onLoad, { once: true });
      offs.push(() => img.removeEventListener("load", onLoad));
    });

    const onWin = () => computeAndSetCoords();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);

    return () => {
      ro?.disconnect();
      offs.forEach((off) => off());
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [message, anchorRect, computeAndSetCoords]);

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onExpire?.(playerId), 300);
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [duration, playerId, onExpire]);

  if (!visible) return null;

  const bubble = (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={bubbleRef}
          key={message}
          initial={{ opacity: 0, y: 0, scale: 0.96 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [25, -10],
            scale: [0.96, 1]
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration,
            ease: "easeInOut",
            opacity: { times: [0, 0.1, 0.9, 1], duration },
            y: { duration, ease: "easeInOut" }
          }}
          className={cn(
            "fixed z-[9999] select-none pointer-events-auto group",
            "px-3.5 py-2 text-sm rounded-2xl font-medium tracking-tight",
            "overflow-hidden break-words text-center",
            "border backdrop-blur-[22px] backdrop-saturate-150",
            "border-white/20 bg-gradient-to-br from-accent/30 via-background/45 to-accent/10",
            "shadow-[0_6px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_18px_rgba(var(--accent-rgb),0.08)]",
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
            overflow: "hidden"
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
              "text-foreground-soft dark:text-accent-foreground"
            )}
            dangerouslySetInnerHTML={{
              __html:
                /\n/.test(message) && !/<br\s*\/?>|<\/p>/i.test(message)
                  ? message.replace(/\n/g, "<br>")
                  : message
            }}
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
              pointerEvents: "auto"
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
