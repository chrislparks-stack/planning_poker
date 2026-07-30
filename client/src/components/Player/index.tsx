import {
  Ban,
  CircleOff,
  Crown,
  DoorOpen,
  Hand,
  History,
  Hourglass,
  MessageSquareText,
  MessagesSquare
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  useKickUserMutation,
  useBanUserMutation,
  useSendChatMessageMutation
} from "@/api";
import darkModeDiscussion from "@/assets/dark-mode-discussion.gif";
import lightModeDiscussion from "@/assets/light-mode-discussion.gif";
import noVoteGif from "@/assets/no-vote.gif";
import { useTheme } from "@/components";
import { CardPickedIcon } from "@/components/ui/card-picked-icon.tsx";
import { CensoredVote } from "@/components/ui/censored-vote.tsx";
import { ChatInputWrapper } from "@/components/ui/chat-input-wrapper.tsx";
import {
  PlayerReactionBurst,
  QuickReactionPicker
} from "@/components/ui/player-reaction.tsx";
import { VoteAdjustment } from "@/components/ui/vote-adjustment.tsx";
import { useBackgroundConfig } from "@/contexts/BackgroundContext.tsx";
import { useToast } from "@/hooks/use-toast";
import { ReactionKind, Room, User } from "@/types";
import { useCardPosition } from "@/utils/cardPositionContext.tsx";

if (typeof window !== "undefined") {
  // picked.gif is a one-shot animation. Preloading it can advance its shared
  // Chromium animation timeline before the submitted-card state is mounted.
  [darkModeDiscussion, lightModeDiscussion, noVoteGif].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

interface CardIconImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
  fallback: React.ReactNode;
}

function CardIconImage({ fallback, alt, ...imgProps }: CardIconImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <img {...imgProps} alt={alt} onError={() => setFailed(true)} />;
}

interface PlayerProps {
  user: User;
  /** The room from the page-level subscription — do NOT subscribe per player,
   * with N players on screen that multiplies every server event by N. */
  room: Room;
  isCardPicked: boolean;
  isGameOver: boolean;
  card?: string | null | undefined;
  roomId: string;
  onMakeOwner?: (userId: string, room: Room) => Promise<void> | void;
  playerPositionMap?: Record<string, { x: number; y: number }>;
  tableRect?: DOMRect | null;
  chatVisible?: boolean;
  reaction?: { id: string; reaction: ReactionKind };
}

type MenuPos = { x: number; y: number } | null;

export function PreviousRoundVoteBadge({
  username,
  card,
  censored
}: {
  username: string;
  card?: string | null;
  censored: boolean;
}) {
  if (!card || censored) return null;

  return (
    <div
      role="status"
      aria-label={`${username}'s previous vote was ${card}`}
      className="pointer-events-none absolute inset-x-0 top-[22px] z-10 flex items-center justify-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase leading-none tracking-[0.06em] text-accent drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
      data-previous-round-vote={card}
    >
      <History aria-hidden="true" className="size-2.5" strokeWidth={2.5} />
      <span>prev {card}</span>
    </div>
  );
}

export function Player({
  user,
  room,
  isCardPicked,
  isGameOver,
  card,
  roomId,
  onMakeOwner,
  playerPositionMap,
  tableRect,
  chatVisible,
  reaction
}: PlayerProps) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const { background } = useBackgroundConfig();

  const isStarry = background.enabled && background.id === "starry";
  const isVoteCensored = room.censorVotes && !user.voteUncensored;
  const previousRoundVote = room.previousRound?.votes.find(
    (vote) => vote.userId === user.id
  );

  const { registerCardRef } = useCardPosition();
  const cardRef = useRef<HTMLDivElement>(null);

  const systemPrefersDark =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;

  const [sendChatMessage] = useSendChatMessageMutation();

  const roomName = room?.name ?? "this room";
  const [kickUser] = useKickUserMutation();
  const [banUser] = useBanUserMutation();
  const previousOwnerRef = useRef<string | null | undefined>(null);
  const [showChatInput, setShowChatInput] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const reactionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(
    () => () => {
      if (reactionCloseTimerRef.current) {
        clearTimeout(reactionCloseTimerRef.current);
      }
    },
    []
  );

  // --- Local state ---
  const [menuPos, setMenuPos] = useState<MenuPos>(null);
  const [menuTargetUser] = useState<User>(user);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const playerPos = playerPositionMap?.[user.id];
  const tableCenterX = tableRect
    ? tableRect.left + tableRect.width / 2
    : window.innerWidth / 2;
  const tableCenterY = tableRect
    ? tableRect.top + tableRect.height / 2
    : window.innerHeight / 2;
  const isLeftSide = playerPos
    ? tableRect
      ? tableRect.left + playerPos.x < tableCenterX
      : playerPos.x < window.innerWidth / 2
    : false;
  const isTopSide = playerPos
    ? tableRect
      ? tableRect.top + playerPos.y < tableCenterY
      : playerPos.y < window.innerHeight / 2
    : false;

  // --- Identity & permissions ---
  const currentUserId =
    typeof window !== "undefined"
      ? (() => {
          try {
            const raw = localStorage.getItem("user");
            if (!raw) return undefined;
            const parsed = JSON.parse(raw) as { id?: string } | null;
            return parsed?.id;
          } catch {
            return undefined;
          }
        })()
      : undefined;

  const isTargetSelf = currentUserId !== undefined && user.id === currentUserId;
  const currentIsRoomOwner =
    room?.roomOwnerId !== undefined && room?.roomOwnerId !== null
      ? room.roomOwnerId === currentUserId
      : false;

  const hasUnreadFromUser = useMemo(() => {
    if (!room || !currentUserId) return false;

    const currentUser = room.users.find((u) => u.id === currentUserId);
    const lastSeenId = currentUser?.lastSeenChatMessageId;

    if (!room.chatHistory?.length) return false;

    const history = room.chatHistory;

    if (!lastSeenId) {
      // If never seen anything, unread if this user has sent anything
      return history.some(
        (m) => m.userId === user.id && m.userId !== currentUserId
      );
    }

    const lastSeenIndex = history.findIndex((m) => m.id === lastSeenId);

    if (lastSeenIndex === -1) {
      return history.some(
        (m) => m.userId === user.id && m.userId !== currentUserId
      );
    }

    return history
      .slice(lastSeenIndex + 1)
      .some((m) => m.userId === user.id && m.userId !== currentUserId);
  }, [room, currentUserId, user.id]);

  // --- Track kick/ban status only (no toasts here) ---
  useEffect(() => {
    if (user.id !== currentUserId) return;
    if (!room || !currentUserId) return;

    const isInRoom = room.users.some((u) => u.id === currentUserId);
    const isBanned = room.bannedUsers?.includes(currentUserId) ?? false;
    const memoryKey = `kickban-${roomId}-${currentUserId}`;
    const existing = localStorage.getItem(memoryKey);

    if (isInRoom) {
      // User is currently in the room — no kick/ban event right now
      return;
    }

    // Only mark the state, don't display toasts
    if (!isInRoom && !isBanned && existing !== "kicked") {
      localStorage.setItem(memoryKey, "kicked");
    }

    if (isBanned && existing !== "banned") {
      localStorage.setItem(memoryKey, "banned");
    }
  }, [room, currentUserId, user.id, roomId]);

  const cardIcon = useMemo(() => {
    const waitingIcon = () => {
      if (
        theme === "dark" ||
        (theme === "system" && systemPrefersDark) ||
        isStarry
      ) {
        return darkModeDiscussion;
      }
      return lightModeDiscussion;
    };

    if (isCardPicked) {
      if (isGameOver) {
        return (
          <div
            className={[
              "text-3xl font-semibold",
              isStarry ? "text-gray-300" : "text-gray-900 dark:text-gray-300"
            ].join(" ")}
          >
            {isVoteCensored ? <CensoredVote value={card ?? ""} /> : card}
          </div>
        );
      } else {
        return <CardPickedIcon />;
      }
    }

    if (isGameOver) {
      return (
        <div
          style={{
            width: 80,
            height: 100,
            background: `
            radial-gradient(
              circle at 50% 50%,
              white 20%,
              transparent 40%
            )
          `,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backdropFilter: "blur(2px)"
          }}
        >
          <CardIconImage
            key="gameover"
            src={noVoteGif}
            alt="Game over"
            className="max-w-none max-h-none"
            style={{ width: 35, height: 30 }}
            fallback={<CircleOff className="text-glass w-6 h-6" />}
          />
        </div>
      );
    }

    return (
      <CardIconImage
        key="waiting"
        src={waitingIcon()}
        alt="Waiting"
        className="max-w-none max-h-none"
        style={{ width: 50, height: 50 }}
        fallback={<Hourglass className="text-glass w-6 h-6" />}
      />
    );
  }, [
    isCardPicked,
    isGameOver,
    theme,
    systemPrefersDark,
    card,
    isStarry,
    isVoteCensored
  ]);

  // --- Context menu logic ---
  const closeMenu = () => setMenuPos(null);

  const onCardContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentIsRoomOwner || isTargetSelf) return;
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 220;
    const menuHeight = 160;
    let x = e.clientX;
    let y = e.clientY;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    if (x + menuWidth > viewportW) x = Math.max(8, viewportW - menuWidth - 8);
    if (y + menuHeight > viewportH) y = Math.max(8, viewportH - menuHeight - 8);
    setMenuPos({ x, y });
  };

  const onCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!currentIsRoomOwner || isTargetSelf) return;
    if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
      e.preventDefault();
      const rect = (e.target as Element).getBoundingClientRect();
      const x = Math.min(
        window.innerWidth - 8,
        Math.round(rect.left + rect.width / 2)
      );
      const y = Math.min(
        window.innerHeight - 8,
        Math.round(rect.top + rect.height / 2)
      );
      setMenuPos({ x, y });
    }
  };

  useEffect(() => {
    if (!menuPos) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const path =
        (ev.composedPath && ev.composedPath()) ||
        (ev as MouseEvent & { path?: EventTarget[] }).path;
      if (menuRef.current) {
        if (Array.isArray(path)) {
          if (path.includes(menuRef.current)) return;
        } else if (menuRef.current.contains(ev.target as Node)) return;
      }
      closeMenu();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeMenu();
    };
    const onWindowChange = () => closeMenu();
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [menuPos]);

  useEffect(() => {
    if (!room || !currentUserId) return;

    const currentOwnerId = room.roomOwnerId;
    const previousOwnerId = previousOwnerRef.current;

    if (
      previousOwnerId &&
      previousOwnerId !== currentOwnerId &&
      currentOwnerId === currentUserId
    ) {
      const previousOwnerUsername =
        room.users.find((u) => u.id === previousOwnerId)?.username ??
        "The previous owner";

      toast({
        title: "Control transferred 👑",
        description: `${previousOwnerUsername} has passed you room owner status\nYou now control ${roomName}`
      });
    }

    previousOwnerRef.current = currentOwnerId;
  }, [room, currentUserId, toast, roomName]);

  // --- Actions ---
  const handleMakeOwner = async () => {
    closeMenu();
    if (!onMakeOwner || !room) return;
    try {
      await onMakeOwner(user.id, room);
      toast({
        title: "Ownership transferred",
        description: `${user.username} is now the room owner`
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to make owner",
        variant: "destructive"
      });
    }
  };

  const handleKick = async () => {
    closeMenu();
    try {
      await kickUser({ variables: { roomId, targetUserId: user.id } });
      toast({
        title: "User kicked",
        description: `${user.username} has been removed from ${roomName}.`
      });
    } catch (err) {
      console.error("Kick failed:", err);
      toast({
        title: "Kick failed",
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleBan = async () => {
    closeMenu();
    try {
      await banUser({ variables: { roomId, targetUserId: user.id } });
      toast({
        title: "User banned",
        description: `${user.username} has been banned from ${roomName}.`,
        variant: "destructive"
      });
    } catch (err) {
      console.error("Ban failed:", err);
      toast({
        title: "Ban failed",
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive"
      });
    }
  };

  // --- Actions ---
  useEffect(() => {
    registerCardRef(user.id, cardRef);
  }, [user.id, registerCardRef, cardRef]);

  const handleSendChat = async (plain: string, formatted: string) => {
    if (!currentUserId || !roomId) return;
    try {
      const rect = cardRef.current?.getBoundingClientRect();
      let position: { x: number; y: number; width: number; height: number };
      if (rect) {
        position = {
          x: rect.left / window.innerWidth,
          y: rect.top / window.innerHeight,
          width: rect.width / window.innerWidth,
          height: rect.height / window.innerHeight
        };
      } else {
        position = {
          x: 0.5,
          y: 0.5,
          width: 0.5,
          height: 0.5
        };
      }

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

  // --- Context menu UI ---
  const menu = menuPos ? (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      aria-label={`Actions for ${menuTargetUser.username}`}
      className="fixed z-[1000] w-56 rounded-md border bg-popover text-popover-foreground shadow-lg"
      style={{ left: menuPos.x, top: menuPos.y, minWidth: 180 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="py-1">
        {currentIsRoomOwner && room?.roomOwnerId !== user.id && (
          <>
            <div className="w-full text-left px-3 py-2 text-sm font-semibold">
              {" "}
              Room Owner Options
            </div>
            <button
              onClick={handleMakeOwner}
              className="w-full text-left px-3 py-1 text-sm hover:bg-accent/10 flex flex-row"
            >
              <Crown className="h-4 w-4 mr-2" /> Make room owner
            </button>
            <div className="my-1 border-t border-muted" />
            <div className="w-full text-left px-3 py-2 text-sm font-semibold">
              {" "}
              Kick/Ban Options
            </div>
            <button
              onClick={handleKick}
              className="w-full text-left px-3 py-1 text-sm hover:bg-accent/10 flex flex-row"
            >
              Kick user <DoorOpen className="h-4 w-4 ml-2" />
            </button>
            <button
              onClick={handleBan}
              className="w-full text-left px-3 py-1 text-sm text-destructive hover:bg-destructive/10 flex flex-row"
            >
              Ban user <Ban className="h-4 w-4 text-red-600 ml-2" />
            </button>
          </>
        )}
      </div>
    </div>
  ) : null;

  const interactiveProps =
    currentIsRoomOwner && !isTargetSelf
      ? {
          tabIndex: 0,
          onContextMenu: onCardContextMenu,
          onKeyDown: onCardKeyDown,
          "aria-expanded": !!menuPos
        }
      : { tabIndex: 0 };

  const truncateUsername = (name: string) =>
    name.length < 30 ? name : `${name.slice(0, 26)}...`;

  const openReactionMenu = () => {
    if (reactionCloseTimerRef.current) {
      clearTimeout(reactionCloseTimerRef.current);
      reactionCloseTimerRef.current = null;
    }
    setShowReactionMenu(true);
  };

  const closeReactionMenuSoon = () => {
    if (reactionCloseTimerRef.current) {
      clearTimeout(reactionCloseTimerRef.current);
    }
    reactionCloseTimerRef.current = setTimeout(() => {
      setShowReactionMenu(false);
      reactionCloseTimerRef.current = null;
    }, 120);
  };

  const title = useMemo(() => {
    if (isTargetSelf && !chatVisible) {
      return isGameOver ? undefined : "Click to chat";
    }

    const name = truncateUsername(user.username);
    const isRevote = room.previousRound != null;

    if (hasUnreadFromUser) {
      return `${name} has a new message...`;
    }

    if (!isGameOver) {
      return user.lastCardPicked == null
        ? `${name} is ${isRevote ? "considering their revote" : "thinking"}...`
        : `${name} has ${isRevote ? "revoted" : "voted"}`;
    }

    if (user.lastCardPicked == null) {
      return `${name} did not ${isRevote ? "revote" : "vote"}`;
    }
    if (isVoteCensored) {
      return `${name}'s ${isRevote ? "revote" : "vote"} is censored`;
    }
    return `${name} ${isRevote ? "revoted" : "voted"} ${user.lastCardValue}`;
  }, [
    user.username,
    user.lastCardPicked,
    user.lastCardValue,
    isGameOver,
    hasUnreadFromUser,
    chatVisible,
    isTargetSelf,
    isVoteCensored,
    room.previousRound
  ]);

  return (
    <div className="flex flex-col items-center" data-testid="player">
      <div
        className="relative"
        onMouseEnter={openReactionMenu}
        onMouseLeave={closeReactionMenuSoon}
        onFocusCapture={openReactionMenu}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            closeReactionMenuSoon();
          }
        }}
      >
        <div
          className={`flex flex-col items-center ${
            isTargetSelf && !chatVisible ? "cursor-pointer" : "cursor-default"
          }`}
          ref={cardRef}
          title={title}
          {...(isTargetSelf && !chatVisible
            ? {
                role: "button",
                tabIndex: 0,
                onClick: () => {
                  setShowReactionMenu(false);
                  setShowChatInput(!showChatInput);
                },
                onKeyDown: (e: React.KeyboardEvent) => {
                  // only when the card itself is focused — keystrokes inside the
                  // chat composer (message editor, gif search) bubble up here
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowReactionMenu(false);
                    setShowChatInput((v) => !v);
                  }
                }
              }
            : {})}
        >
          <div
            {...interactiveProps}
            className="relative flex flex-col items-center z-20 hover:z-50 focus-within:z-50 transition-[z-index]"
          >
            {/* Glow Behind Card */}
            <div
              className="absolute top-0 left-0 right-0 mx-auto rounded-xl blur-sm"
              style={{
                width: "4rem",
                height: "6rem",
                boxShadow: `0 0 5px 3px hsl(var(--accent) / 0.65)`,
                background: `
                radial-gradient(
                  circle at 50% 50%,
                  hsl(var(--accent) / 0.55) 0%,
                  transparent var(--glass-fade-stop)
                )
              `
              }}
            />

            {/* Glass Card */}
            <div
              data-hand-raised={user.handRaised || undefined}
              className={`
              relative w-[4rem] h-[6rem]
              rounded-xl isolate
              backdrop-blur-[2px]
              shadow-[inset_0_0_6px_rgba(0,0,0,0.45),inset_0_0_20px_rgba(0,0,0,0.25)]
              group
              ${user.handRaised ? "player-card-hand-raised" : ""}
            `}
            >
              {isTargetSelf && !chatVisible && (
                <div
                  className="
                  flex mt-1.5 ml-1
                  text-[5px] uppercase tracking-[0.14em]
                  select-none flex-row
                "
                  style={{
                    textShadow: `
                    0 0 1px rgba(255,255,255,0.5),
                    0 1px 2px rgba(0,0,0,0.6),
                    0 0 6px hsla(var(--accent), 0.45)
                  `
                  }}
                >
                  <span
                    className={`
                    flex flex-row items-center
                    text-center font-bold
                    transition-all duration-500
                    scale-x-[-1]
                    ${
                      showReactionMenu
                        ? "text-accent/90"
                        : "text-accent/50 dark:text-accent/25"
                    }
                  `}
                  >
                    <MessageSquareText className="text-glass w-2.5 h-2.5 ml-[2px]" />
                  </span>
                  <span
                    className={`
                    flex flex-row items-center
                    text-center font-bold
                    transition-all duration-300
                    ${
                      showReactionMenu
                        ? "text-accent delay-100"
                        : "text-accent/0"
                    }
                  `}
                  >
                    Click to chat
                  </span>
                </div>
              )}

              {user.handRaised && (
                <div
                  aria-label="Hand raised"
                  role="img"
                  className={`player-hand-raised-status pointer-events-none absolute right-0 top-0 z-10 flex h-[19px] w-[15px] items-center justify-center rounded-bl-[8px] rounded-tr-xl transition-opacity duration-100 ${
                    showReactionMenu ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <Hand
                    aria-hidden="true"
                    strokeWidth={1.2}
                    className="h-[13px] w-[10px]"
                  />
                </div>
              )}

              <div
                className="
                absolute inset-0
                flex flex-col items-center justify-center
                pointer-events-none
              "
              >
                {/* Avatar / revealed vote */}
                <div className="flex items-center justify-center">
                  {cardIcon}
                </div>
              </div>
              <div className={isStarry ? "starry" : undefined}>
                {isGameOver && room.showVoteChanges && !isVoteCensored && (
                  <VoteAdjustment
                    currentCard={user.lastCardPicked}
                    currentValue={user.lastCardValue}
                    previousCard={user.previousCardPicked}
                    previousValue={user.previousCardValue}
                    showOriginalLabel={room.previousRound == null}
                  />
                )}
                {isGameOver && (
                  <PreviousRoundVoteBadge
                    username={user.username}
                    card={previousRoundVote?.card}
                    censored={isVoteCensored}
                  />
                )}
                <div
                  className="
                  absolute bottom-[4px] w-full text-center text-[14px]
                  font-semibold tracking-wide pointer-events-none select-none
                  text-glass
                "
                >
                  <div
                    className="relative inline-flex max-w-full flex-row items-center justify-center gap-[3px] whitespace-nowrap"
                    style={{
                      fontSize: Math.max(
                        7,
                        Math.min(80 / user.username.length, 14)
                      )
                    }}
                  >
                    {room?.roomOwnerId === user.id && (
                      <Crown className="text-glass w-3 h-3" />
                    )}
                    <span>
                      {user.username.length < 30
                        ? user.username
                        : `${user.username.slice(0, 26)}...`}
                    </span>
                    {hasUnreadFromUser && (
                      <MessagesSquare className="w-[10px] h-[10px] -ml-1 -mt-1 text-accent animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isGameOver && isTargetSelf && !showChatInput && (
          <QuickReactionPicker
            roomId={roomId}
            userId={user.id}
            open={showReactionMenu}
            onClose={() => setShowReactionMenu(false)}
            openBelow={isTopSide}
            onMenuEnter={openReactionMenu}
            onMenuLeave={closeReactionMenuSoon}
            handRaised={user.handRaised}
          />
        )}
        {reaction && (
          <PlayerReactionBurst
            key={reaction.id}
            eventId={reaction.id}
            reaction={reaction.reaction}
          />
        )}
        {isTargetSelf && (
          <ChatInputWrapper
            onSend={(plain, formatted) => handleSendChat(plain, formatted)}
            onClose={() => setShowChatInput(false)}
            isOpen={showChatInput}
            anchorRef={cardRef}
            isLeftSide={isLeftSide}
            isTopSide={isTopSide}
          />
        )}
      </div>
      {menu && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : menu}
    </div>
  );
}
