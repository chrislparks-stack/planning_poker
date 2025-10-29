import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
  duration?: number;
  className?: string;
}

/**
 * ChatBubble – centered above the visible card region,
 * with smooth float, responsive width, and scroll-safe overflow.
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({
                                                        message,
                                                        anchorRef,
                                                        duration = 3,
                                                        className,
                                                      }) => {
  const [visible, setVisible] = useState(true);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();

    setCoords({
      x: rect.left + rect.width,
      y:( rect.top * 1.1) - (rect.height / 2),
    });
  }, [anchorRef]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration * 1000);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!coords) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 0, scale: 0.96 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [0, -35],
            scale: [0.96, 1],
          }}
          transition={{
            duration,
            ease: "easeInOut",
            opacity: { times: [0, 0.1, 0.9, 1], duration },
            y: { duration, ease: "easeInOut" },
          }}
          className={cn(
            // Core layout
            "fixed z-[9999] px-3.5 py-2 text-sm rounded-2xl font-medium tracking-tight select-none pointer-events-none",
            "overflow-hidden break-words text-center backdrop-blur-[22px]",
            // Glass gradient (matching player cards)
            "bg-gradient-to-br from-accent/25 via-background/30 to-accent/10 border border-white/15 shadow-[0_2px_18px_rgba(0,0,0,0.25)]",
            "before:absolute before:inset-0 before:rounded-2xl before:bg-[linear-gradient(to_top_left,rgba(255,255,255,0.35),rgba(255,255,255,0)_55%)] before:mix-blend-screen before:opacity-70 before:pointer-events-none",
            "after:absolute after:inset-0 after:rounded-2xl after:bg-[radial-gradient(circle_at_center,rgba(var(--accent-rgb),0.25),transparent_90%)] after:opacity-40 after:pointer-events-none",
            // Text + media
            "text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
            "[&_b]:font-semibold [&_i]:italic [&_u]:underline",
            "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-1 [&_img]:shadow-md",
            "[&_video]:max-w-full [&_video]:h-auto [&_video]:rounded-lg [&_video]:my-1",
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
            transform: "translateX(-50%)",
            maxWidth: "300px",
            maxHeight: "150px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            overscrollBehavior: "contain",
          }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};
