import { ReloadIcon } from "@radix-ui/react-icons";

import { useResetGameMutation, useShowCardsMutation } from "@/api";
import { useModal } from "@/components/ConfirmationDialog/useModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TableProps {
  roomId: string;
  isCardsPicked: boolean;
  isGameOver: boolean;
  innerRef: React.RefObject<HTMLDivElement | null>;
}

export function Table({
  roomId,
  isCardsPicked,
  isGameOver,
  innerRef
}: TableProps) {
  const { toast } = useToast();

  // Confirm before starting a new game.
  const startNewGame = useModal({
    title: "Are you sure you want to start a new game?",
    description: "This will reset the current game.",
    confirmationText: "Start new game",
    cancellationText: "Cancel"
  });

  const [showCardsMutation, { loading: showCardLoading }] =
    useShowCardsMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Show cards: ${error.message}`,
          variant: "destructive"
        });
      }
    });

  const [resetGameMutation, { loading: resetGameLoading }] =
    useResetGameMutation({
      onError: (error) => {
        toast({
          title: "Error",
          description: `Reset game: ${error.message}`,
          variant: "destructive"
        });
      }
    });

  function handleShowCards() {
    showCardsMutation({ variables: { roomId } });
  }

  function handleResetGame() {
    startNewGame().then(() => {
      resetGameMutation({ variables: { roomId } });
    });
  }

  return (
    <div
      ref={innerRef}
      className="flex justify-center items-center w-[25vw] max-w-72 min-w-48 h-36 border border-primary-500 rounded-full"
    >
      {isCardsPicked ? (
        isGameOver ? (
          <Button
            onClick={handleResetGame}
            disabled={resetGameLoading}
            className="w-36"
            size="lg"
          >
            {resetGameLoading && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Start New Game
          </Button>
        ) : (
          <Button
            onClick={handleShowCards}
            disabled={showCardLoading}
            size="lg"
          >
            {showCardLoading && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reveal cards
          </Button>
        )
      ) : (
        <span>Select an issue to put on the table</span>
      )}
    </div>
  );
}
