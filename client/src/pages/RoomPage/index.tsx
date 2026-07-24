import { useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { validate as validateUUID } from "uuid";

import {
  useGetRoomQuery,
  useJoinRoomMutation,
  useRoomEventsSubscription,
  useRoomSubscription,
  useSetRoomOwnerMutation,
  useUpdateDeckMutation
} from "@/api";
import { CreateUserDialog } from "@/components/CreateUserDialog";
import { Deck } from "@/components/Deck";
import { PageLayout } from "@/components/PageLayout";
import { Room } from "@/components/Room";
import { RoomOptionsDialog } from "@/components/RoomOptionsDialog";
import { StarrySky } from "@/components/StarrySky";
import { ResultsTag } from "@/components/ui/results-tag.tsx";
import { VoteDistributionChart } from "@/components/vote-distribution-chart";
import { useAuth } from "@/contexts";
import { useBackgroundConfig } from "@/contexts/BackgroundContext.tsx";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";
import {
  getStoredRoom,
  removeStoredRoom,
  setStoredRoom,
  touchStoredRoom,
  updateStoredRoom
} from "@/utils";

export function RoomPage() {
  const { roomId } = useParams({ from: "/room/$roomId" });
  const roomRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const redirectingRef = useRef(false);
  const navigate = useNavigate();
  const joinedRoomSessionKey = `HAS_JOINED_ROOM:${roomId}`;

  const isJoinRoomCalledRef = useRef(false);
  const isNewRoomSetupRef = useRef(false);
  const [updateDeck] = useUpdateDeckMutation();
  const [setRoomOwner] = useSetRoomOwnerMutation();
  const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
  const [openRoomOptionsDialog, setOpenRoomOptionsDialog] = useState(false);

  const { background } = useBackgroundConfig();

  const [chatVisible, setChatVisible] = useState(false);

  const handleShowInChat = () => {
    setChatVisible(true);
  };

  const { data: subscriptionData, error: roomSubscriptionError } =
    useRoomSubscription({
      variables: { roomId }
    });

  const { data: roomEventsData, error: roomEventsError } =
    useRoomEventsSubscription({
      variables: { roomId }
    });

  const { data: roomData, error: roomError } = useGetRoomQuery({
    variables: { roomId },
    fetchPolicy: "network-only"
  });

  const [joinRoomMutation, { data: joinRoomData }] = useJoinRoomMutation({
    onCompleted: (data) => {
      const room = data?.joinRoom;
      if (!room || !user) return;
      const roomUser = room.users.find((candidate) => candidate.id === user.id);

      updateStoredRoom(room.id, {
        Cards: room.deck.cards,
        RoomName: room.name ?? null,
        RoomOwner: room.roomOwnerId,
        Username: roomUser?.username
      });

      const prefix = `kickban-${room.id}-`;
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });

      // Only show toast on first join, not on refresh
      const hasJoinedBefore =
        sessionStorage.getItem(joinedRoomSessionKey) === "true";
      if (!hasJoinedBefore) {
        toast({
          title: "Joined room",
          description: `You joined ${room.name ?? "the room"} successfully.`,
          duration: 2500
        });
        sessionStorage.setItem(joinedRoomSessionKey, "true");
      }
    },
    onError: (error) => {
      const msg = error.message?.toLowerCase() ?? "";
      const roomName = roomData?.roomById?.name ?? "this room";
      const memoryKey = `kickban-${roomId}-${user?.id ?? "unknown"}`;

      // Ignore harmless rejoin or missing-room errors
      if (
        msg.includes("room not found") ||
        msg.includes("invalid room") ||
        msg.includes("already joined")
      ) {
        console.warn("[JoinRoom] Suppressed harmless error:", msg);
        return;
      }

      if (msg.includes("banned")) {
        localStorage.setItem(memoryKey, "banned");
        removeStoredRoom(roomId);
        toast({
          title: "You are banned",
          description: `You are banned from ${roomName}`,
          variant: "destructive",
          duration: 4000
        });
        navigate({ to: "/" });
        return;
      }

      // Everything else shows the toast
      toast({
        title: "Error",
        description: `Join room failed: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // --- Kick / Ban detection ---
  useEffect(() => {
    if (!roomEventsData?.roomEvents || !user) return;

    const event = roomEventsData.roomEvents;
    if (event.targetUserId !== user.id) return; // ignore events for other users

    if (event.eventType === "USER_KICKED") {
      // don't double-toast if you triggered it yourself
      if (!localStorage.getItem("KICKED")) {
        toast({
          title: "You were kicked",
          description: "You were removed from the room.",
          variant: "destructive"
        });
      }
      removeStoredRoom(roomId);
      sessionStorage.removeItem(joinedRoomSessionKey);
      navigate({ to: "/" });
    }

    if (event.eventType === "USER_BANNED") {
      toast({
        title: "You were banned",
        description: "You have been banned from the room.",
        variant: "destructive"
      });
      removeStoredRoom(roomId);
      sessionStorage.removeItem(joinedRoomSessionKey);
      navigate({ to: "/" });
    }
  }, [roomEventsData, user, toast, navigate, roomId, joinedRoomSessionKey]);

  // --- Initial join logic ---
  useEffect(() => {
    if (user === undefined || !roomData) return;

    const isNewRoom = sessionStorage.getItem("NEW_ROOM_CREATED") === "true";
    if (isNewRoom) {
      sessionStorage.removeItem("NEW_ROOM_CREATED");
      isNewRoomSetupRef.current = true;
      setOpenCreateUserDialog(true);
      return;
    }

    if (!user && roomData.roomById && roomData.roomById.users.length >= 0) {
      setOpenCreateUserDialog(true);
      return;
    }

    if (user && !isJoinRoomCalledRef.current && !isNewRoomSetupRef.current) {
      const roomStorage = getStoredRoom(roomId);

      let roomName = "";
      let roomOwner = "";
      let roomUsername = user.username;

      if (roomStorage) {
        roomName = roomStorage.RoomName ?? "";
        roomOwner = roomStorage.RoomOwner ?? "";
        roomUsername = roomStorage.Username ?? user.username;
      }

      if (!roomStorage && roomData.roomById) {
        const existingMembership = roomData.roomById.users.find(
          (candidate) => candidate.id === user.id
        );
        roomUsername = existingMembership?.username ?? user.username;
        const storageData = {
          RoomID: roomData.roomById.id,
          Cards: roomData.roomById.deck.cards,
          RoomName: roomData.roomById.name ?? null,
          RoomOwner: roomData.roomById.roomOwnerId ?? user.id,
          Username: roomUsername
        };
        setStoredRoom(storageData);
      }

      joinRoomMutation({
        variables: {
          roomId,
          user: {
            id: user.id,
            username: roomUsername,
            roomName:
              roomName && roomName.trim().length > 0 ? roomName : undefined
          },
          roomOwnerId:
            roomOwner && roomOwner.trim().length > 0 ? roomOwner : undefined
        }
      }).then(({ data }) => {
        const room = data?.joinRoom;
        if (!room) return;

        if (!room.roomOwnerId) {
          if (!roomOwner) roomOwner = user.id;
          setRoomOwner({
            variables: {
              roomId: roomId,
              userId: roomOwner
            }
          });
        }

        const isNewRoom = sessionStorage.getItem("NEW_ROOM_CREATED") === "true";

        if (isNewRoom) {
          setOpenCreateUserDialog(true);
          sessionStorage.removeItem("NEW_ROOM_CREATED");
        }
      });

      isJoinRoomCalledRef.current = true;
    }
  }, [roomData, user, joinRoomMutation, roomId, setRoomOwner]);

  // --- Join helper ---
  async function handleJoinRoomMutation(
    user: User,
    selectedCards?: (string | number)[],
    roomOwnerId?: string,
    roomName?: string | null
  ) {
    try {
      isJoinRoomCalledRef.current = true;
      isNewRoomSetupRef.current = false;
      const storedRoom = getStoredRoom(roomId);
      if (!storedRoom) {
        const roomData = {
          RoomID: roomId,
          Cards: selectedCards ?? [],
          RoomName: roomName ?? null,
          RoomOwner: roomOwnerId,
          Username: user.username
        };
        setStoredRoom(roomData);
      } else {
        if (selectedCards) {
          updateStoredRoom(roomId, { Cards: selectedCards });
        }
      }

      if (selectedCards) {
        await updateDeck({
          variables: {
            roomId,
            cards: selectedCards.map(String)
          }
        });
      }

      await joinRoomMutation({
        variables: {
          roomId: roomId,
          user: {
            id: user.id,
            username: getStoredRoom(roomId)?.Username ?? user.username,
            roomName: roomName ?? undefined
          }
        }
      });

      if (roomOwnerId) {
        await setRoomOwner({
          variables: {
            roomId: roomId,
            userId: roomOwnerId
          }
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Something went wrong while joining: ${error}`,
        variant: "destructive"
      });
    }
  }

  const room =
    subscriptionData?.room ?? roomData?.roomById ?? joinRoomData?.joinRoom;
  const hasLoadedRoom = Boolean(room);

  useEffect(() => {
    if (!hasLoadedRoom) return;

    const markRoomActive = () => {
      touchStoredRoom(roomId);
    };
    const markVisibleRoomActive = () => {
      if (document.visibilityState === "visible") {
        markRoomActive();
      }
    };

    markRoomActive();
    document.addEventListener("pointerdown", markRoomActive, true);
    document.addEventListener("keydown", markRoomActive, true);
    document.addEventListener("visibilitychange", markVisibleRoomActive);
    window.addEventListener("focus", markRoomActive);

    return () => {
      document.removeEventListener("pointerdown", markRoomActive, true);
      document.removeEventListener("keydown", markRoomActive, true);
      document.removeEventListener("visibilitychange", markVisibleRoomActive);
      window.removeEventListener("focus", markRoomActive);
    };
  }, [hasLoadedRoom, roomId]);

  const APP_NAME = "Summit Planning Poker";
  const prevTitleRef = useRef<string>(
    typeof document !== "undefined" ? document.title : APP_NAME
  );

  useEffect(() => {
    if (!prevTitleRef.current) {
      prevTitleRef.current =
        typeof document !== "undefined" ? document.title : APP_NAME;
    }

    if (room) {
      const userCount = room.users?.length ?? 0;
      const hasName =
        typeof room.name === "string" && room.name.trim().length > 0;

      const titleBase = hasName
        ? room.name!.trim()
        : openCreateUserDialog
        ? "Creating New Room..."
        : "Private Room";

      document.title = `${titleBase} ${
        userCount > 0
          ? ` (${userCount} player${userCount === 1 ? "" : "s"})`
          : ""
      } | ${APP_NAME}`;
    } else {
      document.title = APP_NAME;
    }

    return () => {
      document.title = prevTitleRef.current || APP_NAME;
    };
  }, [room, openCreateUserDialog]);

  useEffect(() => {
    if (!room || !user) return;

    const storedCards = getStoredRoom(roomId)?.Cards ?? null;

    const hasEverConfiguredDeck =
      Array.isArray(storedCards) && storedCards.length > 0;

    const isCreationFlow =
      sessionStorage.getItem("NEW_ROOM_CREATED") === "true";

    if (
      room.roomOwnerId === user.id &&
      room.deck.cards.length === 0 &&
      !hasEverConfiguredDeck &&
      !isCreationFlow
    ) {
      setOpenRoomOptionsDialog(true);
    }
  }, [room, user, roomId]);

  const isMissingRoom =
    roomData &&
    roomData.roomById === null &&
    !joinRoomData &&
    !subscriptionData;

  // --- Redirects ---
  useEffect(() => {
    if (!roomId) return;
    if (typeof roomId !== "string") return;

    const isValid = validateUUID(roomId);
    if (!isValid) {
      redirectingRef.current = true;
      navigate({ to: "/invalid-room/$roomId", params: { roomId } });
    }
  }, [roomId, navigate]);

  useEffect(() => {
    if (roomData && roomData.roomById === null) {
      redirectingRef.current = true;
      const timeout = setTimeout(() => {
        if (!joinRoomData && !subscriptionData) {
          navigate({ to: "/missing-room/$roomId", params: { roomId } });
        }
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [roomData, joinRoomData, subscriptionData, roomId, navigate]);

  // --- Error handlers ---
  useEffect(() => {
    if (!redirectingRef.current && !isMissingRoom && roomSubscriptionError) {
      toast({
        title: "Error",
        description: `Room subscription: ${roomSubscriptionError.message}`,
        variant: "destructive"
      });
    }
  }, [roomSubscriptionError, toast, isMissingRoom]);

  useEffect(() => {
    if (!redirectingRef.current && !isMissingRoom && roomError) {
      toast({
        title: "Error",
        description: `Room: ${roomError.message}`,
        variant: "destructive"
      });
    }
  }, [roomError, toast, isMissingRoom]);

  useEffect(() => {
    if (!redirectingRef.current && roomEventsError) {
      toast({
        title: "Error",
        description: `Room Event Error: ${roomEventsError.message}`,
        variant: "destructive"
      });
    }
  }, [roomEventsError, toast]);

  return (
    <div>
      {!room ? (
        <div className="flex h-screen items-center justify-center">
          <span className="text-lg font-semibold">Loading room...</span>
        </div>
      ) : (
        <>
          <PageLayout
            room={room}
            users={room.users}
            showChat={chatVisible}
            setShowChat={(visible) => setChatVisible(visible)}
          >
            {background.enabled && background.id === "starry" && (
              <div className="absolute inset-0 pointer-events-none opacity-100 dark:opacity-60 -z-10">
                <StarrySky
                  gradient={background.options.gradient ?? true}
                  fallingStars={background.options["shooting-stars"] ?? true}
                  mountains={background.options.mountains ?? true}
                />
              </div>
            )}
            <div className="flex flex-1 min-h-0 w-full flex-col">
              <div ref={roomRef} className="flex-1 min-h-0 overflow-auto">
                <div className="flex justify-center px-4 pt-[25px]">
                  <Room
                    room={room}
                    onShowInChat={handleShowInChat}
                    roomRef={roomRef}
                    chatVisible={chatVisible}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 w-full">
                <div className="vote-results-scroller relative w-full pt-4 pb-6 backdrop-blur-sm [scrollbar-width:thin]">
                  <div className="mx-auto flex w-full min-w-[660px] items-end justify-center px-2">
                    <Deck
                      roomId={roomId}
                      isGameOver={room.isGameOver}
                      lockVotes={room.lockVotes}
                      cards={room.deck.cards}
                      users={room.users}
                      previousRound={room.previousRound}
                    />
                    {room.isGameOver && (
                      <div className="ml-2 flex min-w-[246px] max-w-[548px] flex-[0_1_auto] justify-center">
                        <ResultsTag
                          isRevote={room.previousRound != null}
                          hasBackground={
                            background.enabled && background.id === "starry"
                          }
                        />
                        <VoteDistributionChart room={room} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </PageLayout>

          <CreateUserDialog
            roomData={room}
            existingUser={user}
            open={openCreateUserDialog}
            setOpen={setOpenCreateUserDialog}
            onJoin={(user, selectedCards, roomOwner?, roomName?) =>
              roomOwner
                ? handleJoinRoomMutation(
                    user,
                    selectedCards,
                    roomOwner,
                    roomName
                  )
                : handleJoinRoomMutation(user)
            }
          />

          <RoomOptionsDialog
            open={openRoomOptionsDialog}
            setOpen={setOpenRoomOptionsDialog}
            room={room}
          />
        </>
      )}
    </div>
  );
}
