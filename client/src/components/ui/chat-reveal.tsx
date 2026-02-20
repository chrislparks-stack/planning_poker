import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {useAuth} from "@/contexts";
import {useMarkChatSeenMutation} from "@/api";
import {Room} from "@/types";
import {NotificationDot} from "@/components/ui/notification-dot.tsx";

const HEADER_HEIGHT = 56;
const HEADER_PADDING = 30;

interface ChatRevealPromptProps {
  onClick: () => void;
  menuOpen?: boolean;
  room?: Room;
  chatOpen?: boolean;
}

export const ChatRevealPrompt: React.FC<ChatRevealPromptProps> = ({ onClick, menuOpen = false, room, chatOpen }) => {
  const { user } = useAuth();
  const [markChatSeen] = useMarkChatSeenMutation();
  const [isNearEdge, setIsNearEdge] = useState(false);

  useEffect(() => {
    if (!chatOpen || !room?.id || !user?.id) return;

    markChatSeen({
      variables: {
        roomId: room.id,
        userId: user.id,
      },
    });
  }, [chatOpen]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflowX = "clip";
    body.style.overflowX = "clip";

    let inactivityTimer: number | null = null;

    const startInactivityTimer = () => {
      if (inactivityTimer !== null) return; // already running

      inactivityTimer = window.setTimeout(() => {
        setIsNearEdge(false);
        inactivityTimer = null;
      }, 10_000);
    };

    const clearInactivityTimer = () => {
      if (inactivityTimer !== null) {
        window.clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
    };

    const EDGE_VW = 0.10;
    const EDGE_MAX = 250;

    const handleMouseMove = (e: MouseEvent) => {
      const edgeWidth = Math.min(window.innerWidth * EDGE_VW, EDGE_MAX);

      const nearRight = window.innerWidth - e.clientX < edgeWidth;
      const belowHeader = e.clientY > HEADER_HEIGHT + HEADER_PADDING;
      const shouldShow = nearRight && belowHeader && !menuOpen;

      setIsNearEdge(shouldShow);

      if (shouldShow) {
        startInactivityTimer();
      } else {
        clearInactivityTimer();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInactivityTimer();

      html.style.overflowX = prevHtmlOverflow;
      body.style.overflowX = prevBodyOverflow;
    };
  }, []);

  const unreadCount = React.useMemo(() => {
    if (!room?.chatHistory || !user?.id) return 0;

    const roomUser = room?.users.find(u => u.id === user?.id);
    const lastSeenId = roomUser?.lastSeenChatMessageId;

    // If user has never seen anything
    if (!lastSeenId) {
      return room.chatHistory.filter(m => m.userId !== user.id).length;
    }

    const lastSeenIndex = room.chatHistory.findIndex(
      m => m.id === lastSeenId
    );

    // If last seen not found (pruned, edge case, etc.)
    if (lastSeenIndex === -1) {
      return room.chatHistory.filter(m => m.userId !== user.id).length;
    }

    return room.chatHistory
      .slice(lastSeenIndex + 1)
      .filter(m => m.userId !== user.id)
      .length;

  }, [room?.chatHistory, room?.users, user?.id]);

  const hasUnread = unreadCount > 0;

  return (
    <>
      <AnimatePresence>
        {(isNearEdge || hasUnread) && (
          <motion.div
            key="chat-gradient"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute right-0 bottom-0 w-[10vw] max-w-[250px] z-40"
            style={{
              top: HEADER_HEIGHT,
              background: `
                linear-gradient(
                  to left,
                  hsl(var(--accent) / 0.08),
                  hsl(var(--accent) / 0.05),
                  transparent
                )
              `,
              pointerEvents: "none",
            }}
          >
            {/* Clickable inner layer — inset a bit from the right to avoid scrollbar overlap */}
            <div
              onClick={onClick}
              className="absolute inset-y-0 right-[6px] w-[9.8vw] max-w-[245px] cursor-pointer"
              style={{ pointerEvents: "auto" }}
            >
              <motion.div
                key="chat-text"
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60 }}
                transition={{ type: "spring", stiffness: 100, damping: 18 }}
                className="absolute top-[45%] z-50 right-[0.5vw] -translate-y-1/2 select-none will-change-transform group"
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
                  className={`flex flex-row font-mono text-[13px] uppercase tracking-[0.18em]
                  backdrop-blur-sm transition-all duration-300
                  ${
                    hasUnread
                      ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                      : "text-accent/70 drop-shadow-[0_0_1px_rgba(0,0,0,0.4)] group-hover:text-accent"
                  }`}
                >
                  {hasUnread
                    ? unreadCount === 1
                      ? "NEW CHAT MESSAGE"
                      : "NEW CHAT MESSAGES"
                    : "SHOW CHAT"}
                  <NotificationDot count={unreadCount} className= "bg-red-500 text-white shadow-md -mr-[5px] -mt-[2px]" />
                </div>
                <div
                  className={`mt-2 text-accent/70 text-xl font-light transition-transform duration-300
                   group-hover:translate-x-[1px]
                   ${
                    hasUnread
                      ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                      : "text-accent/70 drop-shadow-[0_0_1px_rgba(0,0,0,0.4)] group-hover:text-accent"
                  }`
                }
                >
                  ◂
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
