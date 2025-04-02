import { GalleryHorizontalEnd, LogOut, Settings } from "lucide-react";
import { FC, useEffect, useState } from "react";

import { useLogoutMutation, useSetRoomOwnerMutation } from "@/api";
import { EditCardsDialog } from "@/components/EditCardsDialog";
import { EditUserDialog } from "@/components/EditUserDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Room } from "@/types";

interface AccountMenuProps {
  room?: Room;
}

export const AccountMenu: FC<AccountMenuProps> = ({ room }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState("");
  const [openEditUserDialog, setOpenEditUserDialog] = useState(false);
  const [openEditCardsDialog, setOpenEditCardsDialog] = useState(false);
  const [setRoomOwner] = useSetRoomOwnerMutation();
  const [logoutMutation] = useLogoutMutation({
    onCompleted() {
      logout?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Logout: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (room) {
      setRoomId(room.id);
    }
  }, [room]);

  function handleLogout() {
    if (user) {
      logoutMutation({
        variables: {
          userId: user.id,
        },
      });
      setRoomOwner({
        variables: {
          roomId: roomId,
          userId: null,
        },
      });
    }
  }

  function handleOpenEditUserDialog() {
    setOpenEditUserDialog(true);
  }

  function handleOpenCardsUserDialog() {
    setOpenEditCardsDialog(true);
  }

  return (
    <>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Account menu">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-lg font-bold leading-none"> Settings </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleOpenEditUserDialog}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Change Username</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {user.id === room.roomOwnerId && (
              <div>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleOpenCardsUserDialog}>
                    <GalleryHorizontalEnd className="mr-2 h-4 w-4" />
                    <span>Change Cards</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </div>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <EditUserDialog open={openEditUserDialog} setOpen={setOpenEditUserDialog} />
      <EditCardsDialog open={openEditCardsDialog} setOpen={setOpenEditCardsDialog} room={room} />
    </>
  );
};
