import React, { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  playerId: string;
  playerRef: HTMLDivElement | null;
  tableRect: DOMRect | null;
  duration?: number;
  className?: string;
  onExpire?: (playerId: string) => void;
}

/**
 * Anchors bubble relative to the shared table, not viewport.
 * This keeps all clients perfectly aligned, regardless of scaling or scroll.
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({
                                                        message,
                                                        playerId,
                                                        playerRef,
                                                        tableRect,
                                                        duration = 3,
                                                        className,
                                                        onExpire,
                                                      }) => {
  const [visible, setVisible] = useState(true);
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: -9999,
    y: -9999,
  });
  const bubbleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el || !playerRef || !tableRect) return;

    requestAnimationFrame(() => {
      const playerRect = playerRef.getBoundingClientRect();
      const bubbleRect = el.getBoundingClientRect();
      const isLeft =
        playerRect.left + playerRect.width / 2 < tableRect.left + tableRect.width / 2;

      const horizontalGap = 12;
      const x = isLeft
        ? playerRect.left - tableRect.left - bubbleRect.width - horizontalGap
        : playerRect.right - tableRect.left + horizontalGap;

      const y =
        playerRect.top - tableRect.top - bubbleRect.height * 0.35;

      setCoords({ x, y });
    });
  }, [message, playerRef, tableRect]);

  // --- Visibility timer -------------------------------------------------------
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
            "absolute z-[9999] px-3.5 py-2 text-sm rounded-2xl font-medium tracking-tight select-none pointer-events-none",
            "overflow-hidden break-words text-center backdrop-blur-[22px]",
            "bg-gradient-to-br from-accent/25 via-background/30 to-accent/10 border border-white/15 shadow-[0_2px_18px_rgba(0,0,0,0.25)]",
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
            transform: "translate(0, -100%)",
            maxWidth: "300px",
            maxHeight: "150px",
            overflowY: "auto",
          }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      )}
    </AnimatePresence>
  );

  return createPortal(bubble, tableRefOrBody(tableRect));
};

// helper to ensure bubbles still render if tableRect missing
function tableRefOrBody(tableRect: DOMRect | null) {
  const el = document.querySelector(".relative"); // fallback: your table wrapper
  return el ?? document.body;
}
