import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Room, ChatMessage, User } from "@/types";
import { cn } from "@/lib/utils";
import { useRoomChatSubscription, useSendChatMessageMutation } from "@/api";
import { ChatInput } from "@/components/ui/chat-input";
import { useToast } from "@/hooks/use-toast";
import { useCardPosition } from "@/utils/cardPositionContext";
import {Info} from "lucide-react";

export const ChatPanel: React.FC<{
  room?: Room;
  user?: User;
  onClose: () => void;
  visible: boolean;
}> = ({ room, user, onClose, visible }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();
  const { getCardRect } = useCardPosition();
  const [sendChatMessage] = useSendChatMessageMutation();

  const roomId = room?.id;
  const currentUserId = user?.id;

  useEffect(() => {
    if (!roomId || messages.length) return;
    setMessages(room?.chatHistory ?? []);
  }, [roomId]);

  useEffect(() => {
    const smoothScrollToBottom = () => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    };

    const timeout = setTimeout(() => {
      requestAnimationFrame(smoothScrollToBottom);
    }, 350);

    return () => clearTimeout(timeout);
  }, [visible, room?.id, room?.chatHistory]);

  useEffect(() => {
    if (!visible) return;
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
    setShowScrollButton(false);

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [visible]);

  // Subscribe for new messages
  useRoomChatSubscription({
    variables: { roomId: roomId ?? "" },
    skip: !roomId,
    onData: ({ data }) => {
      const msg = data?.data?.roomChat;
      if (!msg) return;

      setMessages(prev => {
        const exists = prev.some(
          m => m.id === msg.id ||
            (m.userId === msg.userId &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 2000 &&
              m.content === msg.content)
        );
        if (exists) return prev;

        if (!autoScroll) setHasNewMessages(true);
        return [...prev, msg];
      });
    }
  });

  // Auto-scroll on new message
  useEffect(() => {
    if (!scrollRef.current || !autoScroll) return;
    queueMicrotask(() => {
      const el = scrollRef.current;
      if (!el || !autoScroll) return;

      // Wait for any images in the last message to load
      const imgs = el.querySelectorAll("img");
      const pending = Array.from(imgs)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        );

      Promise.all(pending).then(() => {
        requestAnimationFrame(() => {
          el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
          });
        });
      });
    });
  }, [messages.length, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(isNearBottom);
    setShowScrollButton(!isNearBottom);

    if (isNearBottom) setHasNewMessages(false);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // Send chat (with optional position)
  const handleSendChat = async (plain: string, formatted: string) => {
    if (!currentUserId || !roomId || !user) return;

    const tempId = `local-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: tempId,
      roomId,
      userId: currentUserId,
      username: user.username,
      content: plain,
      formattedContent: formatted,
      contentType: "html",
      timestamp: new Date().toISOString(),
    };

    // instantly show in UI
    setMessages((prev) => [...prev, newMessage]);

    try {
      const position = getCardRect(currentUserId);
      const variables: any = {
        ...newMessage,
        position,
      };

      await sendChatMessage({ variables });
    } catch (err) {
      console.error("Failed to send chat:", err);
      toast({
        title: "Message failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      // rollback if needed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  useEffect(() => {
    if (!visible) {
      setAutoScroll(true);
      setShowScrollButton(false);
      setHasNewMessages(false);
    }
  }, [visible]);

  return (
    <>
      <motion.aside
        key="chat-panel"
        initial={false}
        animate={{
          x: visible ? 0 : "100%",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
        className={cn(
          "absolute right-0 h-[calc(100vh-56px)] w-[340px] flex flex-col z-50 overflow-hidden border-l border-border/70 backdrop-blur-2xl",

          // --- Light mode: subtle warm tint for contrast ---
          "bg-[color-mix(in_oklab,hsl(var(--background))_85%,hsl(var(--accent))_15%)] shadow-[0_0_25px_-6px_rgba(0,0,0,0.25)]",

          // --- Dark mode: deeper hue rotation + emissive accent edge ---
          "dark:bg-[hsl(calc(var(--accent-hue)+12)_40%_12%_/_0.9)]",
          "dark:shadow-[inset_0_0_25px_rgba(255,255,255,0.04),0_0_18px_rgba(var(--accent-rgb),0.25)]",
          "dark:border-l-accent/25",

          // --- Accent shimmer edge divider ---
          "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-gradient-to-b before:from-accent/20 before:via-accent/60 before:to-accent/20 before:blur-[2px]"
        )}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-2 bg-gradient-to-r from-background/70 via-background/60 to-background/70 backdrop-blur-md overflow-visible z-40">
          {/* Title + Info */}
          <div className="flex items-center gap-2">
            <h2 className="relative text-lg font-semibold tracking-wide overflow-hidden">
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent/80 via-accent/60 to-foreground/90 drop-shadow-[0_0_6px_rgba(0,0,0,0.4)]">
        ✦ Live Chat
      </span>

              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%]
          animate-[sheen_6s_linear_infinite] bg-clip-text text-transparent mix-blend-screen pointer-events-none"
                aria-hidden="true"
              >
        ✦ Live Chat
      </span>
            </h2>

            {/* Info tooltip icon */}
            <div className="relative group">
              <div
                className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-accent/40
                   text-accent/70 bg-background/60 backdrop-blur-sm cursor-help hover:text-accent transition-colors duration-200"
              >
                <Info className="w-3.5 h-3.5" strokeWidth={1.8} />
              </div>

              {/* Tooltip box */}
              <div
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-max max-w-[240px]
                 text-[10px] text-foreground/90 bg-background/95 border border-border/60 rounded-md px-2 py-1
                 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300
                 shadow-[0_0_8px_rgba(0,0,0,0.15)] backdrop-blur-sm z-[999] text-center"
              >
                <div>Only the most recent 100 messages are available</div>
                <div className="my-1 h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                <div>Any messages older than 48 hours are automatically removed</div>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="relative text-muted-foreground hover:text-accent transition hover:rotate-90 duration-200
              before:absolute before:inset-[-6px] before:content-[''] before:cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "flex-1 overflow-y-auto relative px-4 py-5 space-y-4 text-sm",
            "scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent",
            "bg-gradient-to-b from-background/70 via-background/55 to-background/75 backdrop-blur-md border-t border-border/50",
            "shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)]",
            "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_inset_0_-1px_6px_rgba(255,255,255,0.03)]",
            "dark:bg-gradient-to-b dark:from-[hsl(var(--background)_/_0.9)] dark:via-[hsl(var(--background)_/_0.7)] dark:to-[hsl(var(--background)_/_0.95)]",
            "dark:after:content-[''] dark:after:absolute dark:after:inset-0 dark:after:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.04)_0%,transparent_70%)] dark:after:pointer-events-none",
            "dark:before:absolute dark:before:inset-0 dark:before:bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.03)_0%,transparent_70%)] dark:before:pointer-events-none",

            // Accent shimmer line
            "before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-accent/50 before:to-transparent"
          )}
        >
          {/* Soft highlight gradients for atmosphere */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-accent/5 to-transparent dark:from-accent/20" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background/85 to-transparent dark:from-background/95" />

          {/* message list as before */}
          {messages.length ? (
            messages.map((msg) => {
              const isSelf = msg.userId === currentUserId;
              const time = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const initials = msg.username
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 140, damping: 18 }}
                  className={cn(
                    "flex items-end gap-2",
                    isSelf ? "justify-end" : "justify-start"
                  )}
                >
                  {!isSelf && (
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold",
                        "shadow-[0_0_6px_rgba(0,0,0,0.25)] dark:shadow-[0_0_6px_rgba(255,255,255,0.1)]",
                        "bg-accent/25 border-accent/40",
                        "text-[color:hsl(var(--foreground-soft))] dark:text-[color:hsl(var(--accent-foreground))]"
                      )}
                    >
                      {initials}
                    </div>
                  )}

                  <div className={cn("flex flex-col", isSelf && "items-end")}>
                    <div
                      className={cn(
                        "px-4 py-2.5 rounded-2xl leading-relaxed backdrop-blur-[3px] border",
                        "max-w-[100%]",
                        isSelf
                          ? "bg-accent/35 dark:bg-accent/25 border-accent/40 text-[color:hsl(var(--foreground-soft))] dark:text-[color:hsl(var(--accent-foreground))]"
                          : "bg-muted/35 dark:bg-muted/25 border-border text-[color:hsl(var(--foreground-soft))] dark:text-[color:hsl(var(--foreground))]"
                      )}
                    >
                      <div
                        className="chat-bubble-content leading-snug"
                        dangerouslySetInnerHTML={{
                          __html: msg.formattedContent || msg.content,
                        }}
                      />
                    </div>

                    <div
                      className={cn(
                        "text-[10px] mt-1 font-mono tracking-tight flex items-center gap-1",
                        isSelf
                          ? "text-accent-foreground/50 flex-row-reverse"
                          : "text-muted-foreground/60"
                      )}
                    >
                      <span>{msg.username}</span>
                      <span className="opacity-60">•</span>
                      <span>{time}</span>
                    </div>
                  </div>

                  {isSelf && (
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold",
                        "shadow-[0_0_6px_rgba(0,0,0,0.25)] dark:shadow-[0_0_6px_rgba(255,255,255,0.1)]",
                        "bg-accent/25 border-accent/40",
                        "text-[color:hsl(var(--foreground-soft))] dark:text-[color:hsl(var(--accent-foreground))]"
                      )}
                    >
                      {initials}
                    </div>
                  )}
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
        <div className="relative border-t border-border/60 bg-gradient-to-t from-background/95 via-background/85 to-background/90 backdrop-blur-2xl p-2 shadow-[0_-4px_14px_rgba(0,0,0,0.25)] dark:shadow-[0_-4px_10px_rgba(255,255,255,0.05)]">
          <div className="absolute -top-px left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent blur-[1px]" />
          <ChatInput onSend={handleSendChat} inPanel />
        </div>
      </motion.aside>

      {visible && (
        <button
          onClick={() => {
            scrollToBottom();
            setHasNewMessages(false);
          }}
          className={cn(
            "fixed bottom-[150px] right-3 z-50 flex items-center gap-1 px-3 py-1.5 rounded-full",
            "text-xs font-semibold tracking-wide backdrop-blur-md border transition-all duration-300",
            hasNewMessages
              ? "border-accent bg-accent/70 text-[color:hsl(var(--accent-foreground))] shadow-[0_0_12px_rgba(var(--accent-rgb),0.6)]"
              : "border-accent/40 bg-[color-mix(in_oklab,hsl(var(--accent))_35%,hsl(var(--background))_65%)] text-[color:hsl(var(--accent-foreground))]"
          )}
          style={{
            transform: showScrollButton ? "translateY(0)" : "translateY(20px)",
            opacity: showScrollButton ? 0.7 : 0,
            transition:
              "transform 0.8s cubic-bezier(0.45, 0, 0.25, 1), opacity 0.6s cubic-bezier(0.45, 0, 0.25, 1)",
          }}
        >
          <span
            className={cn(
              "drop-shadow-[0_0_6px_rgba(var(--accent-rgb),0.4)]",
              hasNewMessages && "animate-pulse"
            )}
          >
            {hasNewMessages ? "↓ New Messages" : "▼ Jump to Bottom"}
          </span>
        </button>
      )}
    </>
  );
};
