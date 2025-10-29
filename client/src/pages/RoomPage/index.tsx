import { useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
  useGetRoomQuery,
  useJoinRoomMutation,
  useLogoutMutation,
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
import { VoteDistributionChart } from "@/components/vote-distribution-chart";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";
import { validate as validateUUID } from "uuid";

export function RoomPage() {
  const { roomId } = useParams({ from: "/room/$roomId" });
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const redirectingRef = useRef(false);
  const navigate = useNavigate();
  const [logoutMutation] = useLogoutMutation();

  const isJoinRoomCalledRef = useRef(false);
  const [updateDeck] = useUpdateDeckMutation();
  const [setRoomOwner] = useSetRoomOwnerMutation();
  const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
  const [openRoomOptionsDialog, setOpenRoomOptionsDialog] = useState(false);

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

      const prefix = `kickban-${room.id}-`;
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });

      // Only show toast on first join, not on refresh
      const hasJoinedBefore =
        sessionStorage.getItem("HAS_JOINED_ROOM") === "true";
      if (!hasJoinedBefore) {
        toast({
          title: "Joined room",
          description: `You joined ${room.name ?? "the room"} successfully.`,
          duration: 2500
        });
        sessionStorage.setItem("HAS_JOINED_ROOM", "true");
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
        localStorage.removeItem("Room");
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
      localStorage.removeItem("Room");
      sessionStorage.removeItem("HAS_JOINED_ROOM");
      // Force full auth logout: backend + local
      try {
        if (user?.id) {
          logoutMutation({
            variables: { userId: user.id }
          }).then(() => {
            logout?.();

            setOpenCreateUserDialog(true);
          });
        }
      } catch (err) {
        console.warn("Failed to run logoutMutation after kick:", err);
      }
    }

    if (event.eventType === "USER_BANNED") {
      toast({
        title: "You were banned",
        description: "You have been banned from the room.",
        variant: "destructive"
      });
      localStorage.removeItem("Room");
      sessionStorage.removeItem("HAS_JOINED_ROOM");
      navigate({ to: "/" });
    }
  }, [roomEventsData, user, toast, navigate]);


  // --- Initial join logic ---
  useEffect(() => {
    if (user === undefined || !roomData) return;

    const isNewRoom = sessionStorage.getItem("NEW_ROOM_CREATED") === "true";
    if (isNewRoom) {
      sessionStorage.removeItem("NEW_ROOM_CREATED");
      setOpenCreateUserDialog(true);
      return;
    }

    if (!user && roomData.roomById && roomData.roomById.users.length >= 0) {
      setOpenCreateUserDialog(true);
      return;
    }

    if (user && !isJoinRoomCalledRef.current) {
      const roomStorageRaw = localStorage.getItem("Room");
      let roomStorage = null;

      if (roomStorageRaw) {
        try {
          roomStorage = JSON.parse(roomStorageRaw);
        } catch {
          localStorage.removeItem("Room");
        }
      }

      if (roomStorage && roomStorage.RoomID !== roomId) {
        localStorage.removeItem("Room");
        roomStorage = null;
      }

      let roomName = "";
      let roomOwner = "";

      if (roomStorage) {
        roomName = roomStorage.RoomName;
        roomOwner = roomStorage.RoomOwner;
      }

      if (!roomStorage && roomData.roomById) {
        const storageData = {
          RoomID: roomData.roomById.id,
          Cards: roomData.roomById.deck.cards,
          RoomName: roomData.roomById.name,
          RoomOwner: roomData.roomById.roomOwnerId ?? user.id
        };
        localStorage.setItem("Room", JSON.stringify(storageData));
      }

      joinRoomMutation({
        variables: {
          roomId,
          user: {
            id: user.id,
            username: user.username,
            roomName: roomName
          },
          roomOwnerId: roomOwner && roomOwner.trim().length > 0 ? roomOwner : undefined
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
        } else if ((room.deck.cards as unknown as never[]).length < 1) {
          setOpenRoomOptionsDialog(true);
        }
      });

      isJoinRoomCalledRef.current = true;
    }
  }, [roomData, user, joinRoomMutation, roomId]);

  // --- Join helper ---
  async function handleJoinRoomMutation(
    user: User,
    selectedCards?: (string | number)[],
    roomOwnerId?: string,
    roomName?: string | null
  ) {
    try {
      if (!localStorage.getItem("Room")) {
        const roomData = {
          RoomID: roomId,
          Cards: selectedCards,
          RoomName: roomName ?? null,
          RoomOwner: roomOwnerId
        };
        localStorage.setItem("Room", JSON.stringify(roomData));
      } else {
        const stored = localStorage.getItem("Room");
        let roomData;
        try {
          roomData = stored ? JSON.parse(stored) : null;
        } catch {
          console.error("Failed to parse Room from localStorage");
          roomData = null;
        }
        if (roomData && selectedCards) {
          roomData.Cards = selectedCards;
          localStorage.setItem("Room", JSON.stringify(roomData));
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
            username: user.username,
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

  const APP_NAME = "Summit Planning Poker";
  const prevTitleRef = useRef<string>(
    typeof document !== "undefined" ? document.title : APP_NAME
  );

  useEffect(() => {
    if (!prevTitleRef.current) {
      prevTitleRef.current = typeof document !== "undefined" ? document.title : APP_NAME;
    }

    if (room) {
      const userCount = room.users?.length ?? 0;
      const hasName = typeof room.name === "string" && room.name.trim().length > 0;

      const titleBase = hasName
        ? room.name!.trim() : openCreateUserDialog ? "Creating New Room..." : "Private Room";

      document.title = `${titleBase} ${userCount > 0 ? ` (${userCount} player${userCount === 1 ? "" : "s"})` : ""} | ${APP_NAME}`;
    } else {
      document.title = APP_NAME;
    }

    return () => {
      document.title = prevTitleRef.current || APP_NAME;
    };
  }, [room?.name, room?.users?.length, openCreateUserDialog]);

  const isMissingRoom =
    roomData && roomData.roomById === null && !joinRoomData && !subscriptionData;

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
          <PageLayout room={room} users={room.users}>
            <div className="relative h-[calc(100vh-80px)] overflow-hidden">
              {/* Scrollable Room container */}
              <div
                  className="absolute top-0 left-0 right-0 overflow-y-auto"
                  style={{
                    height: `calc(100% - ${room.isGameOver ? 300 : 140}px)`,
                    paddingBottom: "1rem",
                  }}
              >
                <Room room={room} />
              </div>


              {/* Deck + Chart remain absolute at bottom, untouched */}
              <div className="absolute bottom-10 left-0 right-0 mx-auto w-full max-w-4xl">
                <div
                    className={`flex gap-4 ${
                        room.isGameOver
                            ? "sm:flex-row sm:justify-center"
                            : "justify-center"
                    }`}
                >
                  <div
                      className={`flex ${
                          room.isGameOver
                              ? "justify-center sm:justify-start"
                              : "justify-center"
                      }`}
                  >
                    <Deck
                        roomId={roomId}
                        isGameOver={room.isGameOver}
                        cards={room.deck.cards}
                        table={room.game.table}
                    />
                  </div>

                  {room.isGameOver && room.game.table.length > 0 && (
                      <div className="flex justify-center sm:justify-end w-full sm:w-1/2">
                        <VoteDistributionChart room={room} />
                      </div>
                  )}
                </div>
              </div>
            </div>
          </PageLayout>

          <CreateUserDialog
            roomData={room}
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
