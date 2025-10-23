import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import {FC, SVGProps} from "react";

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

interface HeaderProps {
  room?: Room;
  users?: User[];
}

export const Header: FC<HeaderProps> = ({ room, users }) => {
  const { user } = useAuth();
  const { copyRoomUrlToClipboard } = useCopyRoomUrlToClipboard();

  const handleCopyRoomUrl = async () => {
    if (room) {
      await copyRoomUrlToClipboard(room.id);
    }
  };

  function Logo(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        role="img"
        aria-label="PokerPlanning.org Logo"
      >
        <defs>
          <linearGradient
            id="logoGradient"
            x1="0"
            y1="0"
            x2="100"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" style={{ stopColor: "var(--accent-start)" }} />
            <stop
              offset="25%"
              style={{ stopColor: "hsl(var(--accent-stop-1))" }}
            />
            <stop
              offset="50%"
              style={{ stopColor: "hsl(var(--accent-stop-2))" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "hsl(var(--accent-stop-3))" }}
            />
          </linearGradient>
        </defs>

        <rect
          x="10"
          y="10"
          width="80"
          height="80"
          rx="20"
          fill="url(#logoGradient)"
        />
        <path
          d="M30 50 C 30 30, 70 30, 70 50 C 70 70, 30 70, 30 50"
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          style={{ color: "hsl(var(--accent-foreground))" }}
        />
      </svg>
    );
  }

  return (
    <header className="flex justify-between items-center h-14 px-4 border-b">
      <div className="flex items-center space-x-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/" className="text-lg font-semibold flex items-center">
              <Logo className="h-8 w-8 mr-2" />
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
          <AccountMenu room={room} />
        </div>
      )}
    </header>
  );
};
