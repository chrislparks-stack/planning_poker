import { Link, useNavigate } from "@tanstack/react-router";
import { FC, useMemo } from "react";

import { useCreateRoomMutation } from "@/api";
import { Footer } from "@/components/footer";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

export const HomePage: FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [createRoomMutation, { loading }] = useCreateRoomMutation({
    onCompleted: (data) => {
      sessionStorage.setItem("NEW_ROOM_CREATED", "true");

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

  const storedRoom = useMemo(() => {
    const local = localStorage.getItem("Room");
    if (!local) return null;
    try {
      const parsed = JSON.parse(local);
      if (parsed?.RoomID && Array.isArray(parsed?.Cards)) return parsed;
      return null;
    } catch {
      return null;
    }
  }, []);

  const storedUser = useMemo(() => {
    const local = localStorage.getItem("user");
    if (!local) return null;
    try {
      const parsed = JSON.parse(local);
      if (parsed?.id && parsed?.username) return parsed;
      return null;
    } catch {
      return null;
    }
  }, []);

  function onCreateRoom() {
    if (localStorage.getItem("Room")) {
      localStorage.removeItem("Room");
    }

    if (localStorage.getItem("user")) {
      localStorage.removeItem("user");
    }

    createRoomMutation({
      variables: {
        cards: []
      }
    });
  }

  function onJoinExisting() {
    if (!storedRoom) return;
    navigate({
      to: "/room/$roomId",
      params: { roomId: storedRoom.RoomID }
    }).catch((e) => console.log(e));
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
            className="relative left-[calc(50%-13rem)] top-20 aspect-[1155/678] w-[36.125rem]
               -translate-x-1/2 rotate-[30deg]
               bg-gradient-to-tr from-indigo-600 via-purple-500 to-fuchsia-500
               opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]
               animate-[waveDrift_18s_ease-in-out_infinite]"
          />
        </div>

        <style>
          {`
            @keyframes waveDrift {
              0%, 100% {
                transform: translateY(60px) translateX(-280px) rotate(30deg) scale(1);
              }
              50% {
                transform: translateY(40px) translateX(-270px) rotate(32deg) scale(1.1);
              }
            }
          `}
        </style>

        <div className="mx-auto max-w-4xl py-32 sm:py-38 lg:py-46">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Collaborate and Estimate Faster with Planning Poker
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Apps Poker Planning offers an open-source, intuitive platform for
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

              {storedRoom && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="lg"
                        className="h-12 relative group"
                        onClick={onJoinExisting}
                        disabled={loading}
                      >
                        Join Existing Game
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={8}
                      align="center"
                      className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-100 px-5 py-4 shadow-xl border border-zinc-700/70 text-sm text-left max-w-xs backdrop-blur-sm"
                    >
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[0.75rem] uppercase tracking-wider text-zinc-400">
                            Last Session
                          </p>
                        </div>

                        <p className="font-semibold text-white text-base leading-tight truncate">
                          Room: {storedRoom.RoomName || "Unnamed Room"}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <span>Last joined as</span>
                          <span className="text-indigo-400 font-medium">
                            {storedUser.username || "Unknown User"}
                          </span>
                          {storedRoom.RoomOwner &&
                            storedRoom.RoomOwner === storedUser.id && (
                              <span className="text-[0.65rem] px-2 py-0.5 rounded-md bg-indigo-600/20 text-indigo-300 font-medium">
                                Room Owner
                              </span>
                            )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
