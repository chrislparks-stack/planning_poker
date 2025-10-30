import React, {useEffect, useMemo, useRef, useState} from "react";
import { createPortal } from "react-dom";

import {
  useGetRoomQuery,
  useRoomSubscription,
  useKickUserMutation,
  useBanUserMutation,
  useSendChatMessageMutation,
} from "@/api";
import { Card } from "@/components/Card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {useTheme} from "@/components";
import {Ban, Crown, DoorOpen, MessageSquareText} from "lucide-react";
import {ChatInputWrapper} from "@/components/ui/chat-input-wrapper.tsx";

interface PlayerProps {
  user: User;
  isCardPicked: boolean;
  isGameOver: boolean;
  card?: string | null | undefined;
  roomId: string;
  onMakeOwner?: (userId: string) => Promise<void> | void;
  playerPositionMap?: Record<string, { x: number; y: number }>;
  tableRect?: DOMRect | null;
}

type MenuPos = { x: number; y: number } | null;

export function Player({
  user,
  isCardPicked,
  isGameOver,
  card,
  roomId,
  onMakeOwner,
  playerPositionMap,
  tableRect
}: PlayerProps) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const systemPrefersDark = typeof window !== "undefined" && window.matchMedia ?
    window.matchMedia("(prefers-color-scheme: dark)").matches : false;

  // --- Queries & Subscriptions ---
  const { data: roomData } = useGetRoomQuery({ variables: { roomId } });
  const { data: subscriptionData } = useRoomSubscription({
    variables: { roomId }
  });
  const [sendChatMessage] = useSendChatMessageMutation();

  const room = subscriptionData?.room ?? roomData?.roomById;
  const roomName = room?.name ?? "this room";
  const [kickUser] = useKickUserMutation();
  const [banUser] = useBanUserMutation();
  const [showChatInput, setShowChatInput] = useState(false);

  // --- Local state ---
  const [menuPos, setMenuPos] = useState<MenuPos>(null);
  const [menuTargetUser] = useState<User>(user);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const playerPos = playerPositionMap?.[user.id];
  const tableCenterX = tableRect ? tableRect.left + tableRect.width / 2 : window.innerWidth / 2;
  const isLeftSide = playerPos
    ? tableRect
      ? tableRect.left + playerPos.x < tableCenterX
      : playerPos.x < window.innerWidth / 2
    : false;
  const portalRootRef = useRef<Element | null>(
    typeof document !== "undefined" ? document.body : null
  );

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
    const waitingIcon = () =>{
      if (theme === "dark" || (theme === "system" && systemPrefersDark)) {
        return ("https://lottie.host/5f503f6d-b4fa-448b-8fe0-3a45c1e69a21/baw3omE5jy.json");
      }
      return ("https://lottie.host/3e8b13ae-fcf0-4059-86e5-da5c00d47aed/ZdfJuColeq.json");
    }
    if (isCardPicked) {
      if (isGameOver) {
        return (
          <div
            className="text-3xl font-semibold text-gray-900 dark:text-gray-300"
          >
            {card}
          </div>
        );
      } else {
        return (
          <DotLottieReact
            key="picked"
            src="https://lottie.host/8e391350-aac4-4a10-82a8-f15bbb520ebc/TRA06YDEQc.json"
            autoplay
            style={{width: 80, height: 60, margin: -25}}
          />
        );
      }
    }
    if (isGameOver) {
      return (
        <DotLottieReact
          key="gameover"
          src="https://lottie.host/407d17f3-a83c-46ca-ab4c-981dcbc77919/TKjtavdeuG.json"
          loop
          autoplay
          style={{ width: 50, height: 35, margin: -25 }}
        />
      );
    }
    return (
      <DotLottieReact
        key="waiting"
        src={waitingIcon()}
        autoplay
        loop
        style={{ width: 65, height: 50, margin: -25 }}
      />
    );
  }, [isCardPicked, isGameOver, theme, systemPrefersDark, card]);

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
      const path = (ev.composedPath && ev.composedPath()) || (ev as any).path;
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

  // --- Actions ---
  const handleMakeOwner = async () => {
    closeMenu();
    if (!onMakeOwner) return;
    try {
      await onMakeOwner(user.id);
      toast({
        title: "Ownership transferred",
        description: `${user.username} is now the room owner.`
      });
    } catch {
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
  const handleSendChat = async (
    plain: string,
    formatted: string
  ) => {
    if (!currentUserId || !roomId) return;
    try {
      const rect = cardRef.current?.getBoundingClientRect();
      let position: { x: number; y: number; width: number; height: number };
      if (rect) {
        position = {
          x: rect.left / window.innerWidth,
          y: rect.top / window.innerHeight,
          width: rect.width / window.innerWidth,
          height: rect.height / window.innerHeight,
        };
      } else {
        position = {
          x: 0.5,
          y: 0.5,
          width: 0.5,
          height: 0.5,
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
          position,
        },
      });
    } catch (err) {
      console.error("Failed to send chat:", err);
      toast({
        title: "Message failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // --- Context menu UI ---
  const menu = menuPos ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${menuTargetUser.username}`}
      className="fixed z-[1000] w-56 rounded-md border bg-popover text-popover-foreground shadow-lg"
      style={{ left: menuPos.x, top: menuPos.y, minWidth: 180 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="py-1">
        {currentIsRoomOwner && room?.roomOwnerId !== user.id && (
          <>
            <div className="w-full text-left px-3 py-2 text-sm font-semibold"> Room Owner Options</div>
            <button
              onClick={handleMakeOwner}
              className="w-full text-left px-3 py-1 text-sm hover:bg-accent/10 flex flex-row"
            >
              <Crown className="h-4 w-4 mr-2"/> Make room owner
            </button>
            <div className="my-1 border-t border-muted" />
            <div className="w-full text-left px-3 py-2 text-sm font-semibold"> Kick/Ban Options</div>
            <button
              onClick={handleKick}
              className="w-full text-left px-3 py-1 text-sm hover:bg-accent/10 flex flex-row"
            >
              Kick user <DoorOpen className="h-4 w-4 ml-2"/>
            </button>
            <button
              onClick={handleBan}
              className="w-full text-left px-3 py-1 text-sm text-destructive hover:bg-destructive/10 flex flex-row"
            >
              Ban user <Ban className="h-4 w-4 text-red-600 ml-2"/>
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

  return (
    <div className="flex flex-col items-center" data-testid="player">
      {room?.roomOwnerId === user.id ? (
        <div className="flex flex-col items-center" ref={cardRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div {...interactiveProps} style={{ cursor: "default" }}>
                <Card
                  className={`hover:bg-transparent hover:shadow-none w-12 bg-gradient-to-br from-accent/20 via-transparent to-accent/5`}
                >
                  <>
                    <Crown
                      className="absolute top-1 left-1 w-3 h-3 text-accent/70 fill-accent/70"
                      strokeWidth={2}
                    />
                    <Crown
                      className="absolute bottom-[27px] right-1 w-3 h-3 text-accent/70 fill-accent/70 rotate-180"
                      strokeWidth={2}
                    />
                  </>
                  {cardIcon}
                </Card>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Room Owner</TooltipContent>
          </Tooltip>
          {isTargetSelf && (
            <button
              onClick={() => setShowChatInput(!showChatInput)}
              title="Open chat"
              className="absolute p-1 rounded-full bg-background/80 hover:bg-accent/20 border border-border shadow-sm"
              style={{ right: isLeftSide ? 55 : -28 }}
            >
              <MessageSquareText
                className={`w-4 h-4 text-accent ${isLeftSide ? "scale-x-[-1]" : ""}`}
              />
            </button>
          )}
          {isTargetSelf && (
            <ChatInputWrapper
              onSend={(plain, formatted) =>
                handleSendChat(plain, formatted)
              }
              onClose={() => setShowChatInput(false)}
              isOpen={showChatInput}
              className={`top-8 ${isLeftSide ? "right-[55px]" : "-right-[275px]"}`}
              isLeftSide={isLeftSide}
            />
          )}

        </div>
      ) : (
        <div className="relative flex flex-col items-center" style={{ cursor: "default" }} ref={cardRef}>
          {/* Player card */}
          <div {...interactiveProps}>
            <Card className="hover:bg-transparent hover:shadow-none w-12 bg-gradient-to-br from-accent/20 via-transparent to-accent/5">
              {cardIcon}
            </Card>
          </div>

          {isTargetSelf && (
            <button
              onClick={() => setShowChatInput(!showChatInput)}
              title="Open chat"
              className="absolute p-1 rounded-full bg-background/80 hover:bg-accent/20 border border-border shadow-sm"
              style={{ right: isLeftSide ? 55 : -28 }}
            >
              <MessageSquareText
                className={`w-4 h-4 text-accent ${isLeftSide ? "scale-x-[-1]" : ""}`}
              />
            </button>
          )}
          {isTargetSelf && (
            <ChatInputWrapper
              onSend={(plain, formatted) =>
                handleSendChat(plain, formatted)
              }
              onClose={() => setShowChatInput(false)}
              isOpen={showChatInput}
              className={`top-8 ${isLeftSide ? "right-[55px]" : "-right-[275px]"}`}
              isLeftSide={isLeftSide}
            />
          )}
        </div>
      )}
      <span className="text-sm mb-1 text-center">{user.username}</span>
      {portalRootRef.current && menu
        ? createPortal(menu, portalRootRef.current)
        : menu}
    </div>
  );
}
