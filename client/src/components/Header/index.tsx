import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { FC } from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts";
import { useCopyRoomUrlToClipboard } from "@/hooks";
import { Room, User } from "@/types";
import SummitIcon from "@/assets/SummitIcon.png";

interface HeaderProps {
  room?: Room;
  users?: User[];
  onMenuOpenChange?: (open: boolean) => void;
}

export const Header: FC<HeaderProps> = ({ room, users, onMenuOpenChange }) => {
  const { user } = useAuth();
  const { copyRoomUrlToClipboard } = useCopyRoomUrlToClipboard();

  const handleCopyRoomUrl = async () => {
    if (room) {
      await copyRoomUrlToClipboard(room.id);
    }
  };

  function handleOpenChange(open: boolean) {
    onMenuOpenChange?.(open);
  }

  return (
    <header className="flex justify-between items-center h-14 px-4 border-b">
      <div className="flex items-center space-x-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/" className="text-lg font-semibold flex items-center">
              <img
                src={SummitIcon}
                alt="Summit Icon"
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-[1.03] mr-2 mt-1"
              />
              <span className="hidden md:block">
                {" "}
                {room?.name ?? "Planning Poker"}
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={15}>
            <p>Home</p>
          </TooltipContent>
        </Tooltip>
        {room && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleCopyRoomUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={15}>
                <p>Copy room link</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      {user && (
        <div className="flex items-center space-x-4">
          {users && (
            <div className="flex items-center space-x-4 invisible md:visible">
              <div className="flex -space-x-2">
                {users.slice(0, 5).map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <Avatar
                        key={user.id}
                        className="border-2 border-background"
                      >
                        <AvatarFallback>
                          {user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={15}>
                      <p>{user.username}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {users.length > 5 && (
                  <Avatar className="border-2 border-background">
                    <AvatarFallback>+{users.length - 5}</AvatarFallback>
                  </Avatar>
                )}
              </div>
              <Separator orientation="vertical" className="h-6" />
            </div>
          )}
          <AccountMenu room={room} onOpenChange={handleOpenChange} />
        </div>
      )}
    </header>
  );
};
