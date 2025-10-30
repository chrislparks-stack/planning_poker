import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HEADER_HEIGHT = 56;
const HEADER_PADDING = 30;

interface ChatRevealPromptProps {
  onClick: () => void;
  menuOpen?: boolean;
}

export const ChatRevealPrompt: React.FC<ChatRevealPromptProps> = ({ onClick, menuOpen = false }) => {
  const [isNearEdge, setIsNearEdge] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflowX = "clip";
    body.style.overflowX = "clip";

    const handleMouseMove = (e: MouseEvent) => {
      // Only trigger when not in header or account menu area
      const nearRight = window.innerWidth - e.clientX < 80;
      const belowHeader = e.clientY > HEADER_HEIGHT + HEADER_PADDING;
      setIsNearEdge(nearRight && belowHeader && !menuOpen);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      html.style.overflowX = prevHtmlOverflow;
      body.style.overflowX = prevBodyOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      <AnimatePresence>
        {isNearEdge && (
          <motion.div
            key="chat-gradient"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            // Make the whole gradient clickable
            onClick={onClick}
            className="absolute right-0 bottom-0 w-[160px] z-40 cursor-pointer"
            style={{
              top: HEADER_HEIGHT,
              background:
                "linear-gradient(to left, rgba(180,180,180,0.08), transparent)",
            }}
          >
            {/* Inner vertical text stays centered inside the gradient */}
            <motion.div
              key="chat-text"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="absolute top-[45%] right-3 z-50 -translate-y-1/2 select-none will-change-transform group"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                transformOrigin: "center right",
                pointerEvents: "none",
              }}
            >
            <div
                className="font-mono text-[13px] uppercase tracking-[0.18em]
                     text-accent/70 backdrop-blur-sm drop-shadow-[0_0_1px_rgba(0,0,0,0.4)]
                     group-hover:text-accent transition-all duration-200"
              >
                SHOW CHAT
              </div>
              <div
                className="mt-2 text-accent/70 text-xl font-light transition-transform duration-300
                     group-hover:translate-x-[1px]"
              >
                ◂
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
