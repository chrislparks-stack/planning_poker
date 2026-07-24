import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { FC, useMemo } from "react";

import SummitIcon from "@/assets/SummitIcon.png";
import { AccountMenu } from "@/components/AccountMenu";
import { Button } from "@/components/ui/button";
import AvatarCarousel from "@/components/ui/carousel.tsx";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts";
import { useCopyRoomUrlToClipboard } from "@/hooks";
import { Room, User } from "@/types";
import { getStoredRoom } from "@/utils";
import { withTestUsers } from "@/utils/testUtils.tsx";

interface HeaderProps {
  room?: Room;
  users?: User[];
  onMenuOpenChange?: (open: boolean) => void;
  chatOpen?: boolean;
  highlightAppearance?: boolean;
}

export const Header: FC<HeaderProps> = ({
  room,
  users,
  onMenuOpenChange,
  chatOpen,
  highlightAppearance
}) => {
  const { user } = useAuth();
  const { copyRoomUrlToClipboard } = useCopyRoomUrlToClipboard();
  const displayUsers = useMemo(() => withTestUsers(0, users), [users]);

  const handleCopyRoomUrl = async () => {
    if (room) {
      await copyRoomUrlToClipboard(room.id);
    }
  };

  const storedRoom = room ? getStoredRoom(room.id) : null;

  function handleOpenChange(open: boolean) {
    onMenuOpenChange?.(open);
  }

  return (
    <header className="flex justify-between items-center h-14 px-4 border-b z-[100] bg-background shrink-0">
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
                {room?.name || storedRoom?.RoomName || "Planning Poker"}
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
          {displayUsers && (
            <div className="hidden md:flex items-center gap-3">
              <AvatarCarousel
                users={displayUsers}
                chatOpen={chatOpen || false}
              />
              <Separator orientation="vertical" className="h-6" />
            </div>
          )}
          <AccountMenu
            room={room}
            onOpenChange={handleOpenChange}
            highlightAppearance={highlightAppearance}
          />
        </div>
      )}
    </header>
  );
};
