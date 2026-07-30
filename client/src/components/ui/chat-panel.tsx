import { motion } from "framer-motion";
import parse, { Element } from "html-react-parser";
import { Info, MessageCircle, X } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  useMarkChatSeenMutation,
  useRoomChatSubscription,
  useSendChatMessageMutation
} from "@/api";
import { ChatInput } from "@/components/ui/chat-input";
import { ToggleGif } from "@/components/ui/toggle-gif.tsx";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Room, ChatMessage, User } from "@/types";
import { useCardPosition } from "@/utils/cardPositionContext";
import { safeDecompressMessage } from "@/utils/messageUtils.ts";

export const ChatPanel: React.FC<{
  room?: Room;
  user?: User;
  onClose: () => void;
  visible: boolean;
}> = ({ room, user, onClose, visible }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAtBottomRef = useRef(true);
  const pendingScrollToBottomRef = useRef(false);

  const isNearBottom = (el: HTMLDivElement, px = 16) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < px;
  const scrollToBottomSmooth = (el: HTMLDivElement) => {
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const wasVisibleRef = useRef(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [freshMessageIds, setFreshMessageIds] = useState<Set<string>>(
    new Set()
  );
  const [markChatSeen] = useMarkChatSeenMutation();
  const { toast } = useToast();
  const { getCardRect } = useCardPosition();
  const [sendChatMessage] = useSendChatMessageMutation();
  const [now, setNow] = useState(() => Date.now());

  const roomId = room?.id;
  const currentUserId = user?.id;

  useEffect(() => {
    if (!roomId || messages.length) return;

    setMessages((room?.chatHistory ?? []).map(safeDecompressMessage));
  }, [roomId, room?.chatHistory, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (visible && !wasVisibleRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }

    wasVisibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(interval);
      },
      60_000 - (Date.now() % 60_000)
    );

    return () => clearTimeout(timeout);
  }, []);

  // Subscribe for new messages
  useRoomChatSubscription({
    variables: { roomId: roomId ?? "" },
    skip: !roomId,
    onData: ({ data }) => {
      const msg = data?.data?.roomChat;
      if (!msg) return;

      const message = safeDecompressMessage(msg);

      const el = scrollRef.current;
      const wasAnchored = el ? isNearBottom(el, 20) : isAtBottomRef.current;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;

        if (wasAnchored) {
          pendingScrollToBottomRef.current = true;
        } else {
          // user is reading history, don't yank them
          if (message.userId !== currentUserId) setHasNewMessages(true);
        }

        if (message.userId !== currentUserId) {
          setFreshMessageIds((prevFresh) => {
            const next = new Set(prevFresh);
            next.add(message.id);
            return next;
          });
        }

        return [...prev, message];
      });
    }
  });

  useEffect(() => {
    if (!visible || freshMessageIds.size === 0) return;

    if (roomId && currentUserId) {
      markChatSeen({
        variables: { roomId, userId: currentUserId }
      }).catch((err) => {
        console.error("Failed to mark chat seen:", err);
      });
    }
  }, [visible, freshMessageIds, roomId, currentUserId, markChatSeen]);

  useEffect(() => {
    if (!visible || freshMessageIds.size === 0) return;

    const timeout = setTimeout(() => {
      setFreshMessageIds(new Set());
    }, 5000);

    return () => clearTimeout(timeout);
  }, [visible, freshMessageIds]);

  const renderMessage = (html: string) => {
    return parse(html, {
      replace: (domNode) => {
        if (
          domNode instanceof Element &&
          domNode.name === "img" &&
          domNode.attribs?.src?.endsWith(".gif")
        ) {
          return (
            <ToggleGif
              key={domNode.attribs.src}
              src={domNode.attribs.src}
              alt={domNode.attribs.alt || ""}
            />
          );
        }
        return undefined;
      }
    });
  };

  const formatMessageTime = (timestamp: string, now: number) => {
    const messageTime = new Date(timestamp).getTime();
    const diffMs = now - messageTime;

    if (diffMs < 60_000) {
      return "Just now";
    }

    return new Date(messageTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!pendingScrollToBottomRef.current) return;

    pendingScrollToBottomRef.current = false;

    const imgs = el.querySelectorAll("img");
    const pending = Array.from(imgs)
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise<void>((resolve) => {
            img.onload = img.onerror = () => resolve();
          })
      );

    const finish = () => {
      el.scrollTop = el.scrollHeight;
      isAtBottomRef.current = true;
      setShowScrollButton(false);
      setHasNewMessages(false);
    };

    finish();
    if (pending.length) Promise.all(pending).then(finish);
  }, [messages.length]);

  useLayoutEffect(() => {
    if (!visible) return;

    const el = scrollRef.current;
    if (!el) return;

    let raf = 0;
    let lastClientHeight = el.clientHeight;

    const apply = () => {
      const s = scrollRef.current;
      if (!s) return;

      const anchoredBefore = isAtBottomRef.current;

      const newClientHeight = s.clientHeight;
      const delta = lastClientHeight - newClientHeight;

      if (delta !== 0) {
        if (anchoredBefore) {
          s.scrollTop = s.scrollHeight;
          isAtBottomRef.current = true;
          setShowScrollButton(false);
          setHasNewMessages(false);
        } else {
          s.scrollTop = Math.max(0, s.scrollTop + delta);

          const anchoredNow = isNearBottom(s, 20);
          isAtBottomRef.current = anchoredNow;
          setShowScrollButton(!anchoredNow);
          if (anchoredNow) setHasNewMessages(false);
        }

        lastClientHeight = newClientHeight;
      } else {
        lastClientHeight = newClientHeight;
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);

    const ro = new ResizeObserver(schedule);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      ro.disconnect();
    };
  }, [visible]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const anchored = isNearBottom(el, 20);
    isAtBottomRef.current = anchored;

    setShowScrollButton(!anchored);
    if (anchored) setHasNewMessages(false);
  };

  // Send chat (with optional position)
  const handleSendChat = async (plain: string, formatted: string) => {
    if (!currentUserId || !roomId || !user) return;

    try {
      const position = getCardRect(currentUserId);

      await sendChatMessage({
        variables: {
          roomId,
          userId: currentUserId,
          username: user.username,
          content: plain,
          formattedContent: formatted,
          contentType: "html",
          position
        }
      });
    } catch (err) {
      console.error("Failed to send chat:", err);
      toast({
        title: "Message failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!visible) {
      setShowScrollButton(false);
      setHasNewMessages(false);
      setFreshMessageIds(new Set());
    }
  }, [visible]);

  return (
    <>
      <motion.aside
        key="chat-panel"
        initial={{
          x: "100%",
          opacity: 0,
          pointerEvents: "none"
        }}
        animate={{
          x: visible ? 0 : "100%",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none"
        }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
        className={cn(
          "chat-panel fixed right-0 top-[56px] z-[60] flex h-[calc(100vh-56px)] w-[340px] flex-col",
          "transform-gpu overflow-hidden border-l border-border/70 bg-background shadow-[-10px_0_32px_rgba(0,0,0,0.2)] will-change-transform",
          "dark:border-l-accent/25 dark:shadow-[-10px_0_30px_rgba(0,0,0,0.38),inset_1px_0_18px_rgba(var(--accent-rgb),0.045)]"
        )}
      >
        {/* Header */}
        <div className="chat-panel-header relative z-40 flex min-h-[64px] items-center justify-between overflow-visible border-b px-4">
          {/* Title + Info */}
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent/35 bg-accent/10 text-accent shadow-[inset_0_0_12px_rgba(var(--accent-rgb),0.08)]">
              <MessageCircle className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="relative overflow-hidden text-xs font-bold uppercase tracking-[0.18em]">
                <span className="bg-gradient-to-r from-accent/80 via-accent/60 to-foreground/90 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(0,0,0,0.4)]">
                  Live chat
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 animate-[sheen_6s_linear_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] bg-clip-text text-transparent mix-blend-screen"
                >
                  Live chat
                </span>
              </h2>
              <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-accent/65">
                {messages.length} message{messages.length === 1 ? "" : "s"} ·
                48h history
              </p>
            </div>

            {/* Info tooltip icon */}
            <div className="group relative">
              <button
                type="button"
                aria-label="About chat history"
                className="inline-flex size-6 cursor-help items-center justify-center rounded-md text-accent/55 transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
              >
                <Info className="block size-3.5 shrink-0" strokeWidth={1.8} />
              </button>

              {/* Tooltip box */}
              <div className="pointer-events-none absolute right-0 top-full z-[999] mt-1 w-max max-w-[240px] rounded-lg border border-accent/30 bg-background px-3 py-2 text-center text-[0.62rem] leading-relaxed text-foreground/85 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                <div>Only the most recent 100 messages are available</div>
                <div className="mx-auto my-1.5 h-px w-3/4 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                <div>
                  Any messages older than 48 hours are automatically removed
                </div>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "chat-panel-messages scroll-anchoring-fix relative flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-5 text-sm",
            "scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent",
            "shadow-[inset_0_10px_22px_rgba(0,0,0,0.045)]"
          )}
        >
          {messages.length ? (
            messages.map((msg) => {
              const isSelf = msg.userId === currentUserId;
              const time = formatMessageTime(msg.timestamp, now);
              const isFresh = freshMessageIds.has(msg.id);
              const initials = msg.username
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const isEmojiOnly = (() => {
                const html = msg.formattedContent || msg.content || "";

                // Normalize HTML: remove tags, entities, and invisible chars
                const text = html
                  .replace(/<[^>]+>/g, "")
                  .replace(/&nbsp;|<br\s*\/?>|\n|\r/g, "")
                  .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(dec))
                  .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
                    String.fromCodePoint(parseInt(hex, 16))
                  )
                  .replace(/[\u200D\uFE0F]/g, "")
                  .trim();

                // if the text is just one or a few emoji, no letters or numbers
                const emojiRegex =
                  /[\p{Emoji_Presentation}\p{Emoji}\u2190-\u21FF\u2300-\u27BF\u2B00-\u2BFF\u2600-\u26FF]/u;
                return (
                  text.length > 0 &&
                  text.length <= 6 &&
                  !/[A-Za-z0-9!@#$%^&*(),.?":{}|<>\-_+=]/.test(text) &&
                  emojiRegex.test(text)
                );
              })();

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 140, damping: 18 }}
                  className={cn(
                    "flex items-end gap-2.5",
                    isSelf ? "justify-end" : "justify-start"
                  )}
                >
                  {!isSelf && (
                    <div
                      className={cn(
                        "chat-panel-avatar flex size-8 shrink-0 items-center justify-center rounded-lg border text-[0.66rem] font-bold uppercase",
                        "border-accent/35 bg-accent/10 text-accent shadow-[inset_0_0_12px_rgba(var(--accent-rgb),0.1)]"
                      )}
                    >
                      {initials}
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col",
                      isSelf ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "chat-panel-bubble rounded-xl border px-3.5 py-2.5 leading-relaxed transition-all duration-700 ease-out",
                        isSelf
                          ? "chat-panel-bubble-self border-accent/45 text-accent-foreground"
                          : "chat-panel-bubble-peer text-foreground",
                        !isSelf &&
                          isFresh &&
                          "ring-1 ring-accent/65 shadow-[0_0_16px_rgba(var(--accent-rgb),0.26)]",
                        isEmojiOnly &&
                          "bg-transparent border-none shadow-none p-0 leading-none text-[3rem] sm:text-[3.5rem] md:text-[4rem]"
                      )}
                    >
                      <div
                        className={cn(
                          "chat-bubble-content leading-snug break-words break-all whitespace-pre-wrap overflow-hidden",
                          isEmojiOnly &&
                            "flex justify-center items-center text-center select-none p-3 leading-none"
                        )}
                        style={
                          isEmojiOnly
                            ? {
                                fontSize: "3rem",
                                lineHeight: "1",
                                textAlign: "center",
                                fontFamily:
                                  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
                              }
                            : {
                                wordBreak: "break-word"
                              }
                        }
                      >
                        {renderMessage(msg.formattedContent || msg.content)}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "mt-1.5 flex items-center gap-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] transition-all duration-700 ease-out",
                        isSelf
                          ? "flex-row-reverse text-accent/60"
                          : isFresh
                          ? "text-accent drop-shadow-[0_0_5px_rgba(var(--accent-rgb),0.45)]"
                          : "text-muted-foreground/65"
                      )}
                    >
                      <span className="text-foreground/75">{msg.username}</span>
                      <span className="text-accent/35">·</span>
                      <span className="text-muted-foreground/75">{time}</span>
                    </div>
                  </div>

                  {isSelf && (
                    <div
                      className={cn(
                        "chat-panel-avatar flex size-8 shrink-0 items-center justify-center rounded-lg border text-[0.66rem] font-bold uppercase",
                        "border-accent/35 bg-accent/10 text-accent shadow-[inset_0_0_12px_rgba(var(--accent-rgb),0.1)]"
                      )}
                    >
                      {initials}
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="flex min-h-full items-start justify-center pt-8 text-center">
              <div className="chat-panel-empty w-full rounded-xl border px-5 py-6">
                <span className="mx-auto flex size-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-accent/80">
                  Room conversation
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  No messages yet. Start the conversation.
                </p>
              </div>
            </div>
          )}

          {/* Jump to Bottom button inside message scroll area */}
          {visible && (
            <motion.button
              onClick={() => {
                setHasNewMessages(false);

                const el = scrollRef.current;
                if (!el) return;

                scrollToBottomSmooth(el);
              }}
              initial={false}
              animate={{
                opacity: showScrollButton ? 0.7 : 0,
                y: showScrollButton ? 0 : 10
              }}
              transition={{
                type: "spring",
                stiffness: 160,
                damping: 22,
                opacity: { duration: 0.3 }
              }}
              className={cn(
                "ml-auto mr-3 mt-2 flex items-center gap-1 rounded-full px-3 py-1.5",
                "border text-[0.6rem] font-bold uppercase tracking-[0.12em] shadow-md transition-all duration-300",
                hasNewMessages
                  ? "border-accent bg-accent text-accent-foreground shadow-[0_0_12px_rgba(var(--accent-rgb),0.35)]"
                  : "border-accent/40 bg-background text-accent",
                showScrollButton
                  ? "sticky bottom-0 -mr-3 pointer-events-auto"
                  : "absolute -mr-3 [right:200vw] pointer-events-none"
              )}
              style={{
                zIndex: 10,
                alignSelf: "flex-end"
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
            </motion.button>
          )}
        </div>

        {/* Input area */}
        <div className="chat-input-container relative p-3">
          {visible && <ChatInput onSend={handleSendChat} inPanel />}
        </div>
      </motion.aside>
    </>
  );
};
