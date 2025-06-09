import { Link, useNavigate } from "@tanstack/react-router";
import { FC } from "react";

import { useCreateRoomMutation } from "@/api";
import { Footer } from "@/components/footer";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export const HomePage: FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [createRoomMutation, { loading }] = useCreateRoomMutation({
    onCompleted: (data) => {
      navigate({
        to: "/room/$roomId",
        params: { roomId: data.createRoom.id }
      }).catch((e) => console.log(e));
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Create room: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  function onCreateRoom() {
    let roomCards: string[] = [];

    const local = localStorage.getItem("Room");
    if (local) {
      try {
        const room = JSON.parse(local);
        roomCards = room.Cards.map((card: number | string) => String(card));
      } catch (err) {
        console.error("Failed to parse Room from localStorage", err);
      }
    }

    createRoomMutation({
      variables: {
        cards: roomCards
      }
    });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="relative z-50">
        <nav
          aria-label="Global"
          className="flex items-center justify-between p-6 lg:px-8"
        >
          <div className="flex lg:flex-1">
            <Link to="/" className="-m-1.5 p-1.5 flex items-center">
              <img
                src="/logo.svg"
                alt="PokerPlanning.org Logo"
                className="h-8 w-8 mr-2"
              />
              <span className="sr-only">Planning Poker / Scrum Poker</span>
              <span className="text-2xl font-bold">Planning Poker</span>
            </Link>
          </div>
          <div className="flex lg:flex-1 justify-end">
            <ModeToggle />
          </div>
        </nav>
      </header>

      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>
        <div className="mx-auto max-w-4xl py-32 sm:py-38 lg:py-46">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Collaborate and Estimate Faster with Planning Poker
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              PokerPlanning.org offers an open-source, intuitive platform for
              Agile development teams to collaboratively estimate story points
              online. Perfect for Agile workflows, our tool makes
              consensus-based estimation simple, fun, and effective.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-10">
              <Button
                size="lg"
                className="h-12"
                onClick={onCreateRoom}
                disabled={loading}
              >
                Start New Game
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
