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
import { FC, useEffect, useState } from "react";

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
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@/types";
import {SupportDialog} from "@/components/SupportDialog";

interface AccountMenuProps {
  room?: Room;
  onOpenChange?: (open: boolean) => void;
}

export const AccountMenu: FC<AccountMenuProps> = ({ room, onOpenChange }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState("");
  const [openEditUserDialog, setOpenEditUserDialog] = useState(false);
  const [openRoomOptionsDialog, setOpenRoomOptionsDialog] = useState(false);
  const [openToggleModeDialog, setOpenToggleModeDialog] = useState(false);
  const [openConfirmLogoutDialog, setOpenConfirmLogoutDialog] = useState(false);
  const [openSupportDialog, setOpenSupportDialog] = useState(false);
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

  useEffect(() => {
    if (room) {
      setRoomId(room.id);
    }
  }, [room]);

  async function handleLogout() {
    if (user) {
      await logoutMutation({
        variables: {
          userId: user.id
        }
      }).then(async () => {
        if (room && room.users.length > 1) {
          for (const remainingUsers of room.users) {
            if (remainingUsers.id != user.id) {
              await setRoomOwner({
                variables: {
                  roomId: roomId,
                  userId: remainingUsers.id
                }
              });
              break;
            }
          }
        } else {
          await setRoomOwner({
            variables: {
              roomId: roomId,
              userId: ""
            }
          });
        }
        localStorage.removeItem("Room");
      });
    }
  }

  return (
    <>
      {user && (
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              aria-label="Account menu"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  <Settings />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
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
              <DropdownMenuItem onClick={() => setOpenToggleModeDialog(true)} className="cursor-pointer">
                {localStorage.getItem("vite-ui-theme") == "light" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : localStorage.getItem("vite-ui-theme") == "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Palette className="mr-2 h-4 w-4" />
                )}
                <span>Change Theme</span>
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
