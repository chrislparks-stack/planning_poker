import { useGetRoomQuery } from "@/api";
import { Card } from "@/components/Card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User } from "@/types";

interface PlayerProps {
  user: User;
  isCardPicked: boolean;
  isGameOver: boolean;
  card: string | null | undefined;
  roomId: string;
}

export function Player({ user, isCardPicked, isGameOver, card, roomId }: PlayerProps) {
  const { data: roomData } = useGetRoomQuery({
    variables: { roomId },
  });

  const room = roomData?.roomById;
  // Determine the symbol to display based on the player's state.
  const cardSymbol = isCardPicked ? (card ? card : "✅") : isGameOver ? "😴" : "🤔";

  return (
    <div className="flex flex-col items-center" data-testid="player">
      {room?.roomOwnerId === user.id ? (
        <div className="flex flex-col items-center">
          👑
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="hover:bg-transparent hover:shadow-none" style={{ cursor: "default" }}>
                {cardSymbol}
              </Card>
            </TooltipTrigger>
            <TooltipContent side="right"> Room Owner </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <Card style={{ cursor: "default", pointerEvents: "none" }}>{cardSymbol}</Card>
      )}
      <span className="text-sm mb-1">{user.username}</span>
    </div>
  );
}
