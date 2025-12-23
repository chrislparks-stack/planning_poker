import { useNavigate } from "@tanstack/react-router";
import {FC, useEffect, useMemo, useRef, useState} from "react";

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
import SummitLogo from "@/assets/SummitLogo.png";
import {AnimatePresence, motion} from "framer-motion";
import {Scene} from "@/components/ui/scene.tsx";
import {ChevronCascade, ScrollHint} from "@/components/ui/spinners.tsx";

import type { Variants } from "framer-motion";
import {useTouchInput} from "@/utils/mobileUtils.tsx";

const beginClimbVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 2,
      delay: 2,
      ease: [0.25, 0.1, 0.25, 1]
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1]
    },
  },
};

const scrollVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 2,
      delay: 4,
      ease: [0.25, 0.1, 0.25, 1]
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1]
    },
  },
};

export const HomePage: FC = () => {
  const isTouch = useTouchInput();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scene, setScene] = useState(0);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const directionRef = useRef<"up" | "down">("down");
  const [showedLastScene, setShowedLastScene] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (scene === 2) {
      setShowedLastScene(true);
    }
  }, [scene]);


  useEffect(() => {
    let locked = false;
    const SWIPE_THRESHOLD = 40;

    function triggerSceneChange(scrollDirection: "up" | "down") {
      if (locked) return;
      locked = true;

      directionRef.current = scrollDirection;
      setDirection(scrollDirection);

      setScene((s) =>
        scrollDirection === "down"
          ? Math.min(s + 1, 2)
          : Math.max(s - 1, 0)
      );

      setTimeout(() => (locked = false), 700);
    }

    // ===== Mouse / Trackpad =====
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      triggerSceneChange(e.deltaY > 0 ? "down" : "up");
    }

    // ===== Touch =====
    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      touchStartY.current = touch.clientY;
      touchStartX.current = touch.clientX;
    }

    function onTouchEnd(e: TouchEvent) {
      if (touchStartY.current === null || touchStartX.current === null) return;

      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - touchStartY.current;
      const deltaX = touch.clientX - touchStartX.current;

      touchStartY.current = null;
      touchStartX.current = null;

      // Ignore small movements
      if (Math.abs(deltaY) < SWIPE_THRESHOLD) return;

      // Ignore horizontal intent
      if (Math.abs(deltaX) > Math.abs(deltaY)) return;

      triggerSceneChange(deltaY < 0 ? "down" : "up");
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const [createRoomMutation, { loading }] = useCreateRoomMutation({
    onCompleted: async (data) => {
      sessionStorage.setItem("NEW_ROOM_CREATED", "true");

      // Give the backend a moment to fully register the new room
      await new Promise((resolve) => setTimeout(resolve, 200));

      navigate({
        to: "/room/$roomId",
        params: { roomId: data.createRoom.id }
      }).catch((e) => console.error(e));
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
    }
  }, [data, roomError, roomCheckLoading, storedRoom?.RoomID, loading]);

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
    <div className="min-h-[100svh] bg-white dark:bg-gray-900 overflow-hidden">
    <header className="relative z-50">
        <nav
          aria-label="Global"
          className="flex items-center justify-between p-6"
        >
          <div className="flex lg:flex-1 justify-end">
            <ModeToggle />
          </div>
        </nav>
      </header>

      <div
        className="
        relative isolate px-4 sm:px-6 sm:pt-14 lg:px-8
        pb-[calc(env(safe-area-inset-bottom)+10.5rem)]
        sm:pb-[calc(env(safe-area-inset-bottom)+8.5rem)]
      "
      >
        <div
          aria-hidden="true"
          className="absolute w-full h-[65svh] -z-10 flex items-center justify-center overflow-hidden transform-gpu blur-3xl"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              background: `linear-gradient(135deg, hsl(var(--accent-stop-1)) 0%, hsl(var(--accent-stop-2)) 50%, hsl(var(--accent-stop-3)) 100%)`,
              opacity: 0.25
            }}
            className="w-full h-[100svh] max-w-none max-h-none animate-[waveDrift_60s_ease-in-out_infinite] blur-xl"
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
            overflow-x: hidden;
            margin: 0;
            padding: 0;
          }
        `}
        </style>

        <div
          className="
            flex overflow-hidden
            h-[min(60svh,600px)]
          "
        >
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            {scene === 0 && (
              <Scene key="hero" direction={direction}>
                <div className="text-center max-w-xl mx-auto px-2">

                  {/* Scene label */}
                  <p className="text-[clamp(8px,1.5svmin,16px)] uppercase tracking-widest text-accent/80 mb-2 max-[360px]:mb-1">
                    The Journey
                  </p>

                  {/* Brand lockup */}
                  <div className="flex flex-col items-center mb-4 max-[360px]:mb-2">
                    <span className="text-[clamp(12px,2.2svmin,20px)] tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-1">
                      Every Sprint Has a
                    </span>

                    <img
                      src={SummitLogo}
                      alt="Summit"
                      className="w-auto h-auto max-h-[20svmin]"
                    />
                  </div>

                  <div className="flex justify-center mb-4 max-[360px]:mb-2">
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                  </div>

                  <h2
                    className="
                      text-[clamp(16px,2.5svmin,30px)]
                      font-semibold
                      text-gray-800 dark:text-white
                    "
                  >
                    A Better Way to Estimate Together
                  </h2>

                  {/* Supporting copy */}
                  <p
                    className="
                      mt-3
                      text-[clamp(12px,1.6svmin,20px)]
                      max-[360px]:mt-2
                      text-gray-600 dark:text-gray-400
                    "
                  >
                    Collaborative planning poker that helps teams surface assumptions, align faster, and start every sprint with confidence
                  </p>
                </div>
              </Scene>
            )}

            {scene === 1 && (
              <Scene key="climb" direction={direction}>
                <div className="w-full max-w-[50svmin] text-center px-2">
                  <div>
                    <p className="text-[clamp(8px,1.5svmin,18px)] uppercase tracking-widest text-accent/80 mb-1">
                      The Ascent
                    </p>
                    <h2 className="text-[clamp(10px,3svmin,18px)] font-semibold text-gray-700 dark:text-white">
                      How Teams Reach the Summit
                    </h2>
                    <p className="mt-1 text-[clamp(8px,2svmin,15px)] text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                      Summit Planning Poker turns estimation into a shared climb — structured, transparent, and collaborative
                    </p>
                  </div>

                  {/* Route Map */}
                  <section className="relative px-2 py-[5svh]">
                    <div className="absolute left-1/2 top-0 h-[32svh] w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent" />

                    <div className="space-y-[0.5svh]">
                      {[
                        ["Basecamp", "Start Together", "Create a room in seconds and bring your whole team into the same space", "left"],
                        ["The Climb", "Surface Assumptions", "Vote simultaneously to reveal gaps, spark discussion, and build shared understanding", "right"],
                        ["The Summit", "Reach Alignment", "Lock in estimates with confidence and move forward as one team", "left"]
                      ].map(([label, title, desc, side], i) => (
                        <div key={i} className="relative flex items-start">
                          <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent shadow" />
                          <div className={`${side === "left" ? "ml-auto text-left" : "mr-auto text-right"} w-[46%]`}>
                            <p className="text-[clamp(7px,1.5svmin,13px)] uppercase tracking-widest text-accent/80 mb-0.5">
                              {label}
                            </p>
                            <h3 className="text-[clamp(8px,2.3svmin,16px)] font-semibold text-gray-700 dark:text-white">
                              {title}
                            </h3>
                            <p className={`${side === "left" ? "text-left" : " text-right float-right"} mt-0.5 text-[clamp(7px,2svmin,15px)] w-[clamp(100px,30svmin,300px)]  text-gray-600 dark:text-gray-400`}>
                              {desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </Scene>
            )}

            {scene === 2 && (
              <Scene key="cta" direction={direction}>
                <div className="text-center mx-auto">
                  <p className="text-[clamp(8px,1.5svmin,18px)] uppercase tracking-widest text-accent/80 mb-3">
                    The Summit
                  </p>

                  <h2 className="text-[clamp(16px,3.2svmin,45px)] font-semibold text-gray-800 dark:text-white">
                    Alignment Starts Here
                  </h2>

                  <p className="mt-2 text-[clamp(10px,1.8svmin,28px)] text-gray-600 dark:text-gray-400 max-w-[50svw]">
                    Bring your team together, estimate with confidence, and start every sprint on the same page
                  </p>

                  <div className="mt-6 sm:mt-8 flex justify-center">
                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                  </div>

                  <p className="mt-4 sm:mt-6 text-[clamp(8px,1.5svmin,22px)] text-gray-500 dark:text-gray-400">
                    The climb begins with a single session
                  </p>
                </div>
              </Scene>
            )}
          </AnimatePresence>
        </div>

        {/* ================= FIXED FOOTER (restored + mobile-safe) ================= */}
        <div className="fixed  left-1/2 -translate-x-1/2 bottom-0 z-50 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <div className="mx-auto w-full max-w-3xl">
            <div className="relative h-[6svh] min-h-[48px]">
              <AnimatePresence mode="wait">
                {(scene === 0 || scene === 1) && !showedLastScene && (
                  <motion.div
                    key="scroll-hint"
                    variants={scrollVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute inset-x-0 flex justify-center"
                  >
                    <ScrollHint label={isTouch ? "Swipe to continue" : "Scroll to continue"} />
                  </motion.div>
                )}

                {showedLastScene && (
                  <motion.div
                    key="begin-climb"
                    variants={beginClimbVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute inset-x-0 flex justify-center"
                  >
                    <div className="flex flex-col items-center">
                      <p className="text-[clamp(7px,1svmin,15px)] uppercase tracking-wide text-gray-700 dark:text-gray-400">
                        Begin your climb
                      </p>
                      <ChevronCascade overlap={8} travel={2} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              className="
                mx-auto
                flex w-fit items-center justify-center gap-3 sm:gap-4
                rounded-2xl border border-zinc-200/70 dark:border-zinc-700/70
                bg-gray-300 dark:bg-zinc-900/80 backdrop-blur-md shadow-lg
                px-4 sm:px-6 py-3 sm:py-4
                flex-row
              "
            >
            <Button
                size="lg"
                className="h-[clamp(30px,5svmin,45px)] px-6 w-[clamp(70px,16svmin,130px)] text-[clamp(8px,1.5svmin,14px)]"
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
                        variant="secondary"
                        className="h-[clamp(30px,5svmin,45px)] px-6 w-[clamp(80px,20svmin,150px)] text-[clamp(8px,1.5svmin,14px)]"
                        onClick={onJoinExisting}
                        disabled={loading}
                      >
                        Join Existing Game
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent
                      side="top"
                      sideOffset={24}
                      align="center"
                      className="rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-900 dark:to-zinc-800 text-zinc-800 dark:text-zinc-100 px-5 py-4 shadow-xl border border-zinc-700/70 text-sm text-left max-w-xs backdrop-blur-sm"
                    >
                      <div className="flex flex-col space-y-2">
                        <p className="text-[0.75rem] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Last Session
                        </p>

                        <p className="font-semibold text-black dark:text-white text-base leading-tight truncate">
                          Room: {storedRoom?.RoomName || "Unnamed Room"}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <span>Last joined as</span>
                          <span className="text-accent font-medium">
                          {storedUser?.username || "Unknown User"}
                        </span>
                          {storedRoom?.RoomOwner === storedUser?.id && (
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
