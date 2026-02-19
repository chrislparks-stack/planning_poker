import {
  Coffee,
  LogOut,
  Moon,
  Palette,
  Settings,
  Settings2,
  Sun,
  User
} from "lucide-react";
import {FC, useEffect, useRef, useState} from "react";

import { useLogoutMutation, useSetRoomOwnerMutation } from "@/api";
import { ConfirmLogoutDialog } from "@/components/ConfirmLogoutDialog";
import { EditUserDialog } from "@/components/EditUserDialog";
import { RoomOptionsDialog } from "@/components/RoomOptionsDialog";
import { ToggleModeDialog } from "@/components/ToggleModeDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@/types";
import {SupportDialog} from "@/components/SupportDialog";
import {cn} from "@/lib/utils.ts";

interface AccountMenuProps {
  room?: Room;
  onOpenChange?: (open: boolean) => void;
  highlightAppearance?: boolean;
}

export const AccountMenu: FC<AccountMenuProps> = ({ room, onOpenChange, highlightAppearance }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const hoverTimerRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(false);
  const [openEditUserDialog, setOpenEditUserDialog] = useState(false);
  const [openRoomOptionsDialog, setOpenRoomOptionsDialog] = useState(false);
  const [openToggleModeDialog, setOpenToggleModeDialog] = useState(false);
  const [openConfirmLogoutDialog, setOpenConfirmLogoutDialog] = useState(false);
  const [openSupportDialog, setOpenSupportDialog] = useState(false);
  const [flashAppearance, setFlashAppearance] = useState(false);
  const hasFlashedRef = useRef(false);

  const [setRoomOwner] = useSetRoomOwnerMutation();
  const [logoutMutation] = useLogoutMutation({
    onCompleted: async () => {
      logout?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Logout: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const startTooltipTimer = () => {
    if (hoverTimerRef.current !== null) return;

    hoverTimerRef.current = window.setTimeout(() => {
      setAllowTooltip(true);
      hoverTimerRef.current = null;
    }, 700);
  };

  const clearTooltipTimer = () => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setAllowTooltip(false);
  };

  async function handleLogout() {
    if (!user) return;

    if (room && room.id && user.id === room.roomOwnerId) {
      const nextOwner = room.users.find(u => u.id !== user.id);

      await setRoomOwner({
        variables: {
          roomId: room.id,
          userId: nextOwner?.id ?? null,
        },
      });
    }

    await logoutMutation({ variables: { userId: user.id } });

    localStorage.removeItem("Room");
  }

  useEffect(() => {
    if (!menuOpen) return;
    if (!highlightAppearance) return;
    if (hasFlashedRef.current) return;

    hasFlashedRef.current = true;

    setFlashAppearance(true);

    const timer = setTimeout(() => {
      setFlashAppearance(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [menuOpen, highlightAppearance]);

  return (
    <>
      {user && (
        <DropdownMenu
          onOpenChange={(open) => {
            onOpenChange?.(open);
            setMenuOpen(open);

            clearTooltipTimer();
          }}
        >
          <Tooltip key={user.id} open={!menuOpen && allowTooltip} disableHoverableContent>
            <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                    aria-label="Account menu"
                    onPointerEnter={startTooltipTimer}
                    onPointerLeave={clearTooltipTimer}
                    onPointerDown={clearTooltipTimer}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <Settings />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 z-[200]"
              align="end"
              forceMount
              sideOffset={10}
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-lg font-bold leading-none"> Settings </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setOpenToggleModeDialog(true)}
                  className={cn(
                    "cursor-pointer transition-all duration-500",
                    flashAppearance &&
                    "relative bg-accent/15 ring-1 ring-accent/80 shadow-[0_0_12px_hsl(var(--accent)/0.8)]"
                  )}
                >
                {localStorage.getItem("vite-ui-theme") == "light" ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : localStorage.getItem("vite-ui-theme") == "dark" ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : (
                    <Palette className="mr-2 h-4 w-4" />
                  )}
                  <span>Change Appearance</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setOpenEditUserDialog(true)} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Change Username</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {room && user.id === room.roomOwnerId && (
                <div>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => {
                        if (user.id === room.roomOwnerId) {
                          setOpenRoomOptionsDialog(true)
                        } else {
                          toast({
                            title: "Error",
                            description: "Only the room owner can update the room options.  You do not have the proper permissions.",
                            variant: "default"
                          });
                        }
                      }}
                      className="cursor-pointer">
                      <Settings2 className="mr-2 h-4 w-4" />
                      <span>Change Room Options</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </div>
              )}
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setOpenSupportDialog(true)} className="cursor-pointer">
                  <Coffee className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpenConfirmLogoutDialog(true)} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
            <TooltipContent sideOffset={15}>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </DropdownMenu>
      )}
      <EditUserDialog
        open={openEditUserDialog}
        setOpen={setOpenEditUserDialog}
      />
      <RoomOptionsDialog
        open={openRoomOptionsDialog}
        setOpen={setOpenRoomOptionsDialog}
        room={room}
      />
      <ToggleModeDialog
        open={openToggleModeDialog}
        setOpen={setOpenToggleModeDialog}
      />
      <ConfirmLogoutDialog
        open={openConfirmLogoutDialog}
        setOpen={setOpenConfirmLogoutDialog}
        room={room}
        onConfirm={handleLogout}
      />
      <SupportDialog open={openSupportDialog} setOpen={setOpenSupportDialog} />
    </>
  );
};
