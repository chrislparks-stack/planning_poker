import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room, ChatMessage, User } from "@/types";
import { cn } from "@/lib/utils";
import { useRoomChatSubscription, useSendChatMessageMutation } from "@/api";
import { ChatInput } from "@/components/ui/chat-input";
import { useToast } from "@/hooks/use-toast";
import { useCardPosition } from "@/utils/cardPositionContext";

export const ChatPanel: React.FC<{
  room?: Room;
  user?: User;
  onClose: () => void;
  visible: boolean;
}> = ({ room, user, onClose, visible }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();
  const { getCardRect } = useCardPosition();
  const [sendChatMessage] = useSendChatMessageMutation();

  const roomId = room?.id;
  const currentUserId = user?.id;

  // Load chat history & scroll to bottom on open
  useEffect(() => {
    if (visible && room?.chatHistory) {
      setMessages(room.chatHistory);
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [visible, room?.chatHistory]);

  // Subscribe for new messages
  useRoomChatSubscription({
    variables: { roomId: roomId ?? "" },
    skip: !visible || !roomId,
    onData: ({ data }) => {
      const msg = data?.data?.roomChat;
      if (!msg) return;
      setMessages((prev) => [...prev, msg]);
    },
  });

  // Auto-scroll on new message
  useEffect(() => {
    if (!scrollRef.current || !autoScroll) return;
    queueMicrotask(() => {
      const el = scrollRef.current!;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages.length, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(isNearBottom);
  };

  // Send chat (with optional position)
  const handleSendChat = async (plain: string, formatted: string) => {
    if (!currentUserId || !roomId || !user) return;

    try {
      const position = getCardRect(currentUserId);
      const variables: any = {
        roomId,
        userId: currentUserId,
        username: user.username,
        content: plain,
        formattedContent: formatted,
        contentType: "html",
      };
      if (position) variables.position = position;
      await sendChatMessage({ variables });
    } catch (err) {
      console.error("Failed to send chat:", err);
      toast({
        title: "Message failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          key="chat-panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          className={cn(
            "absolute right-0 h-[calc(100vh-56px)] w-[340px] flex flex-col z-50",
            "border-l border-border backdrop-blur-2xl shadow-[0_0_20px_-4px_rgba(0,0,0,0.25)]",
            "bg-gradient-to-b from-background/90 via-background/70 to-background/80"
          )}
        >
          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-2 border-b border-border bg-gradient-to-r from-background/70 via-accent/10 to-background/70 overflow-hidden">
            <div className="absolute inset-0 animate-[sheen_6s_linear_infinite] bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
            <h2 className="relative text-lg font-semibold tracking-wide z-10 bg-clip-text text-transparent bg-gradient-to-r from-accent/80 via-accent/60 to-foreground/90 drop-shadow-[0_0_6px_rgba(0,0,0,0.4)]">
              ✦ Live Chat
            </h2>
            <button
              onClick={onClose}
              className="relative text-muted-foreground hover:text-accent transition z-10 hover:rotate-90 duration-200"
            >
              ✕
            </button>
          </div>


          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-thin scrollbar-thumb-accent/30 scrollbar-track-transparent"
          >
            {messages.length ? (
              messages.map((msg) => {
                const isSelf = msg.userId === currentUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 120, damping: 14 }}
                    className={cn(
                      "relative px-4 py-2.5 rounded-2xl max-w-[80%] leading-relaxed",
                      isSelf
                        ? "ml-auto bg-accent/25 border border-accent/40 text-accent-foreground/90 shadow-sm"
                        : "mr-auto bg-muted/25 border border-border text-foreground/90 shadow-sm"
                    )}
                  >
                  {/* Sender label */}
                    <div
                      className={cn(
                        "text-xs mb-[2px] font-semibold",
                        isSelf ? "text-accent-foreground/70 text-right" : "text-accent/70 text-left"
                      )}
                    >
                      {msg.username}
                    </div>

                    {/* Message content */}
                    <div
                      className="leading-snug text-foreground/90"
                      dangerouslySetInnerHTML={{
                        __html: msg.formattedContent || msg.content,
                      }}
                    />

                    {/* Timestamp */}
                    <div
                      className={cn(
                        "text-[10px] mt-1 font-mono tracking-tight",
                        isSelf
                          ? "text-accent-foreground/40 text-right"
                          : "text-muted-foreground/50 text-left"
                      )}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground/70 text-xs mt-10 italic">
                No messages yet. Start the conversation.
              </div>
            )}
          </div>

          {/* Input area */}
          {/* Input area */}
          <div className="border-t border-border bg-gradient-to-t from-background/95 via-background/70 to-transparent backdrop-blur-lg p-2">
            <ChatInput onSend={handleSendChat} inPanel />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
