import { Link, useNavigate } from "@tanstack/react-router";
import {FC, useEffect, useMemo, useState} from "react";

import {useCreateRoomMutation, useGetRoomQuery} from "@/api";
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

  // ===== Local stored data =====
  const storedRoom = useMemo(() => {
    try {
      const raw = localStorage.getItem("Room");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.RoomID && Array.isArray(parsed?.Cards)) return parsed;
    } catch {}
    return null;
  }, []);

  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.username) return parsed;
    } catch {}
    return null;
  }, []);

  // ===== Verify room exists on server =====
  const { data, loading: roomCheckLoading, error: roomError } = useGetRoomQuery({
    variables: { roomId: storedRoom?.RoomID ?? "" },
    skip: !storedRoom?.RoomID,
    fetchPolicy: "network-only"
  });

  const [validRoom, setValidRoom] = useState(false);

  useEffect(() => {
    if (!storedRoom?.RoomID) return;

    if (roomError) {
      console.warn("Room existence check failed:", roomError.message);
      setValidRoom(false);
      return;
    }

    // Room exists if the query returned data
    if (data?.roomById?.id) {
      setValidRoom(true);
    } else if (!roomCheckLoading && !data?.roomById?.id) {
      setValidRoom(false);
      localStorage.removeItem("Room");
    }
  }, [data, roomError, roomCheckLoading, storedRoom?.RoomID]);

  // ===== Handlers =====
  function onCreateRoom() {
    localStorage.removeItem("Room");
    localStorage.removeItem("user");
    createRoomMutation({ variables: { cards: [] } });
  }

  function onJoinExisting() {
    if (!storedRoom) return;
    navigate({
      to: "/room/$roomId",
      params: { roomId: storedRoom.RoomID }
    }).catch(console.error);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="relative z-50">
        <nav
          aria-label="Global"
          className="flex items-center justify-between p-6 lg:px-8"
        >
          <div className="flex lg:flex-1">
            <Link
              to="/"
              className="-m-1.5 p-1.5 flex flex-col items-center justify-center group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 160 70"
                className="w-20 h-8 -mt-2 -mb-2 transition-transform duration-300 group-hover:-rotate-1"
              >
                <defs>
                  <linearGradient
                    id="sharedGradient"
                    x1="0"
                    y1="0"
                    x2="160"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop
                      offset="0%"
                      style={{ stopColor: "var(--accent-start)" }}
                    />
                    <stop offset="30%" stopColor="hsl(var(--accent-stop-1))" />
                    <stop offset="50%" stopColor="hsl(var(--accent-stop-2))" />
                    <stop offset="100%" stopColor="hsl(var(--accent-stop-3))" />
                  </linearGradient>
                </defs>

                {[
                  { n: "0", r: -33, x: 40, y: 43 },
                  { n: "1", r: -24, x: 54, y: 34 },
                  { n: "3", r: -12, x: 70, y: 28 },
                  { n: "5", r: 0, x: 86, y: 26 },
                  { n: "8", r: 12, x: 102, y: 28 },
                  { n: "13", r: 24, x: 118, y: 34 },
                  { n: "21", r: 33, x: 133, y: 43 }
                ].map((c, i) => (
                  <g key={i} transform={`rotate(${c.r} ${c.x} ${c.y})`}>
                    <rect
                      x={c.x - 9}
                      y={c.y - 14}
                      width="18"
                      height="26"
                      rx="2.5"
                      // use the sharedGradient
                      className={`
                        drop-shadow-sm transition-all duration-500
                        stroke-zinc-400 dark:stroke-zinc-700
                      `}
                      fill="url(#sharedGradient)"
                    />
                    <text
                      x={c.x}
                      y={c.y + 2}
                      fontSize="6"
                      fontWeight="700"
                      textAnchor="middle"
                      className="fill-gray-900 dark:fill-white transition-colors duration-500"
                    >
                      {c.n}
                    </text>
                  </g>
                ))}
              </svg>

              <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Planning Poker
              </span>
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
          className="absolute w-[100vw] h-[65vh] -z-10 flex items-center justify-center overflow-hidden transform-gpu blur-3xl"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              // use CSS vars for gradient stops so the background matches the accent
              background: `linear-gradient(135deg, hsl(var(--accent-stop-1)) 0%, hsl(var(--accent-stop-2)) 50%, hsl(var(--accent-stop-3)) 100%)`,
              opacity: 0.25
            }}
            className="w-[100vw] h-[100vh] max-w-none max-h-none animate-[waveDrift_60s_ease-in-out_infinite] blur-xl"
          />
        </div>

        <style>
          {`
            @keyframes waveDrift {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(25deg) scale(0.9);
              }
              50% {
                transform: translateY(10px) translateX(25px) rotate(35deg) scale(1.1);
              }
            }
            
            html, body {
              overflow: hidden;
              margin: 0;
              padding: 0;           
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

              {validRoom && !roomCheckLoading && (
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
                      className="rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-900 dark:to-zinc-800 text-zinc-800 dark:text-zinc-100 px-5 py-4 shadow-xl border border-zinc-700/70 text-sm text-left max-w-xs backdrop-blur-sm"
                    >
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[0.75rem] uppercase tracking-wider text-zinc-800 dark:text-zinc-400">
                            Last Session
                          </p>
                        </div>

                        <p className="font-semibold text-black dark:text-white text-base leading-tight truncate">
                          Room: {storedRoom?.RoomName || "Unnamed Room"}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-zinc-800 dark:text-zinc-400">
                          <span>Last joined as</span>
                          <span className="text-accent font-medium">
                            {storedUser?.username || "Unknown User"}
                          </span>
                          {storedRoom?.RoomOwner &&
                            storedRoom?.RoomOwner === storedUser?.id && (
                              <span className="text-[0.65rem] px-2 py-0.5 rounded-md bg-accent text-white font-medium">
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
    </div>
  );
};
