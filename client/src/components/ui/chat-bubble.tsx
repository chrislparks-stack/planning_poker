import React, { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  playerId: string;
  absolutePosition?: { x: number; y: number; width?: number; height?: number };
  duration?: number;
  className?: string;
  onExpire?: (playerId: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
                                                        message,
                                                        playerId,
                                                        absolutePosition,
                                                        duration = 3,
                                                        className,
                                                        onExpire,
                                                      }) => {
  const [visible, setVisible] = useState(true);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  // --- compute position (re-usable) ---
  const computeAndSetCoords = () => {
    if (!absolutePosition) return;
    const el = bubbleRef.current;
    if (!el) return;

    const { x, y, width = 0, height = 80 } = absolutePosition;
    const bubbleRect = el.getBoundingClientRect();

    const bubbleWidth = Math.max(1, bubbleRect.width || 160);
    const bubbleHeight = Math.max(1, bubbleRect.height || 60);
    const gap = 12;

    const isLeftSide = x + width / 2 < window.innerWidth / 2;

    // baseline positions
    const baseY = y - height * 0.45;
    const baseX = isLeftSide ? x - bubbleWidth - gap : x + width;

    // clamp to viewport so GIF growth can’t push it off-screen
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

  // Measure after mount and whenever inputs change
  useLayoutEffect(() => {
    if (!absolutePosition) return;

    // two RAFs to ensure DOM + innerHTML/gifs paint at least once
    requestAnimationFrame(() => {
      requestAnimationFrame(computeAndSetCoords);
    });

    // Reposition if bubble size changes (GIFs, fonts, etc.)
    const el = bubbleRef.current;
    let ro: ResizeObserver | undefined;
    if (el && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => computeAndSetCoords());
      ro.observe(el);
    }

    // Reposition when images finish loading (first time)
    const imgs = el?.querySelectorAll?.("img") ?? [];
    const handlers: Array<() => void> = [];
    imgs.forEach((img) => {
      if ((img as HTMLImageElement).complete) return;
      const onLoad = () => computeAndSetCoords();
      img.addEventListener("load", onLoad, { once: true });
      handlers.push(() => img.removeEventListener("load", onLoad));
    });

    // Also respond to viewport changes while visible
    const onWin = () => computeAndSetCoords();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);

    return () => {
      ro?.disconnect();
      handlers.forEach((off) => off());
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [message, absolutePosition]);

  // Expire timer unchanged
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
            "fixed px-3.5 py-2 text-sm rounded-2xl font-medium tracking-tight select-none pointer-events-none",
            "overflow-hidden break-words text-center backdrop-blur-[22px]",
            "bg-gradient-to-br from-accent/25 via-background/30 to-accent/10 border border-white/15 shadow-[0_2px_18px_rgba(0,0,0,0.25)]",
            // keep GIFs contained; this helps stabilize size too
            "[&>img]:block [&>img]:mx-auto [&>img]:my-1.5",
            "[&>img]:max-w-[220px] [&>img]:max-h-[120px] [&>img]:rounded-xl [&>img]:object-contain",
            "[&>img]:shadow-md [&>img]:border [&>img]:border-white/20",
            // hint browser we’ll be changing size/position
            "will-change-transform will-change-contents",
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
            transform: "translate(0, -100%)",
            maxWidth: "300px",
            maxHeight: "150px",
            overflowY: "auto",
            zIndex: 9999,
          }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      )}
    </AnimatePresence>
  );

  return createPortal(bubble, document.body);
};
