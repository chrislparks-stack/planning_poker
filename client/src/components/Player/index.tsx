import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useGetRoomQuery, useRoomSubscription } from "@/api";
import { Card } from "@/components/Card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";

interface PlayerProps {
  user: User;
  isCardPicked: boolean;
  isGameOver: boolean;
  card: string | null | undefined;
  roomId: string;
  onMakeOwner?: (userId: string) => Promise<void> | void;
  onRemoveUser?: (userId: string) => Promise<void> | void;
}

type MenuPos = { x: number; y: number } | null;

export function Player({
  user,
  isCardPicked,
  isGameOver,
  card,
  roomId,
  onMakeOwner,
  onRemoveUser
}: PlayerProps) {
  const { data: roomData } = useGetRoomQuery({
    variables: { roomId }
  });
  const { data: subscriptionData } = useRoomSubscription({
    variables: { roomId }
  });

  const room = subscriptionData?.room ?? roomData?.roomById;
  const { toast } = useToast();

  const cardSymbol = isCardPicked ? card ?? "✅" : isGameOver ? "😴" : "🤔";

  // context menu state
  const [menuPos, setMenuPos] = useState<MenuPos>(null);
  // stable local copy of the targeted user
  const [menuTargetUser] = useState<User>(user);

  // current viewer id from localStorage (if present)
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

  // whether the viewer is the room owner (controls whether context menu is available)
  const currentIsRoomOwner =
    room?.roomOwnerId !== undefined && room?.roomOwnerId !== null
      ? room?.roomOwnerId === currentUserId
      : false;

  const isTargetSelf = currentUserId !== undefined && user.id === currentUserId;

  // portal target (fallback to document.body)
  const portalRootRef = useRef<Element | null>(
    typeof document !== "undefined" ? document.body : null
  );

  // menu DOM ref (used so we don't close the menu if click happened inside it)
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = () => setMenuPos(null);

  // Only owner (and not targeting self) may open the menu
  const onCardContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentIsRoomOwner || isTargetSelf) return;
    e.preventDefault();
    e.stopPropagation();

    const rawX = e.clientX;
    const rawY = e.clientY;

    const menuWidth = 220;
    const menuHeight = 160;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let x = rawX;
    let y = rawY;

    if (x + menuWidth > viewportW) x = Math.max(8, viewportW - menuWidth - 8);
    if (y + menuHeight > viewportH) y = Math.max(8, viewportH - menuHeight - 8);

    setMenuPos({ x, y });
  };

  // keyboard accessibility: owner only (and not for self)
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

  // close menu on outside click / escape / resize / scroll
  useEffect(() => {
    if (!menuPos) return;

    const onDocMouseDown = (ev: MouseEvent) => {
      // if click started inside the menu, don't close — allow the click to reach
      // buttons inside the menu. Use composedPath for Shadow DOM/portals robustness.
      try {
        const path = (ev.composedPath && ev.composedPath()) || (ev as any).path;
        if (menuRef.current) {
          // If composedPath is available, prefer it (works with shadow/portal).
          if (Array.isArray(path)) {
            if (path.includes(menuRef.current)) return;
          } else {
            // Fallback: use contains
            if (menuRef.current.contains(ev.target as Node)) return;
          }
        }
      } catch {
        /* swallow */
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

  const handleMakeOwner = async () => {
    closeMenu();
    if (!currentIsRoomOwner) {
      toast({
        title: "Not allowed",
        description: "Only the current room owner can transfer ownership.",
        variant: "destructive"
      });
      return;
    }
    try {
      if (onMakeOwner) await onMakeOwner(user.id);
      else
        toast({
          title: "Make owner",
          description: `Would make ${user.username} the room owner.`
        });
    } catch {
      toast({
        title: "Error",
        description: "Failed to make owner",
        variant: "destructive"
      });
    }
  };

  const handleRemove = async () => {
    closeMenu();
    if (!currentIsRoomOwner) {
      toast({
        title: "Not allowed",
        description: "Only the room owner can remove users.",
        variant: "destructive"
      });
      return;
    }
    try {
      if (onRemoveUser) await onRemoveUser(user.id);
      else
        toast({
          title: "Remove",
          description: `Would remove ${user.username} from the room.`
        });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive"
      });
    }
  };

  // Menu DOM (owner-only opening)
  const menu = menuPos ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${menuTargetUser.username}`}
      className="fixed z-[1000] w-56 rounded-md border bg-popover text-popover-foreground shadow-lg"
      style={{
        left: menuPos.x,
        top: menuPos.y,
        minWidth: 180
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="py-1">
        {currentIsRoomOwner && room?.roomOwnerId !== user.id && (
          <button
            onClick={handleMakeOwner}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10"
          >
            Make room owner 👑
          </button>
        )}

        {currentIsRoomOwner && room?.roomOwnerId !== user.id && (
          <button
            onClick={handleRemove}
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            disabled
          >
            Remove from room (WIP)
          </button>
        )}
      </div>
    </div>
  ) : null;

  // Only attach interactive handlers when viewer is room owner and not clicking themself.
  const interactiveProps =
    currentIsRoomOwner && !isTargetSelf
      ? {
          tabIndex: 0,
          onContextMenu: onCardContextMenu,
          onKeyDown: onCardKeyDown,
          "aria-haspopup": "menu",
          "aria-expanded": !!menuPos
        }
      : {
          tabIndex: 0
        };

  return (
    <div className="flex flex-col items-center" data-testid="player">
      {room?.roomOwnerId === user.id ? (
        <div className="flex flex-col items-center">
          👑
          <Tooltip>
            <TooltipTrigger asChild>
              <div {...interactiveProps} style={{ cursor: "default" }}>
                <Card className="hover:bg-transparent hover:shadow-none">
                  {cardSymbol}
                </Card>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Room Owner</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div {...interactiveProps} style={{ cursor: "default" }}>
          <Card className="hover:bg-transparent hover:shadow-none">
            {cardSymbol}
          </Card>
        </div>
      )}
      <span className="text-sm mb-1">{user.username}</span>

      {portalRootRef.current && menu
        ? createPortal(menu, portalRootRef.current)
        : menu}
    </div>
  );
}
