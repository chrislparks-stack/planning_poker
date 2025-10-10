import { useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
  useGetRoomQuery,
  useJoinRoomMutation,
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

export function RoomPage() {
  const { roomId } = useParams({ from: "/room/$roomId" });
  const { user } = useAuth();
  const { toast } = useToast();
  const isJoinRoomCalledRef = useRef(false);
  const [updateDeck] = useUpdateDeckMutation();
  const [setRoomOwner] = useSetRoomOwnerMutation();
  const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
  const [openRoomOptionsDialog, setOpenRoomOptionsDialog] = useState(false);

  const { data: subscriptionData, error: roomSubscriptionError } =
    useRoomSubscription({
      variables: { roomId }
    });

  const { data: roomData, error: roomError } = useGetRoomQuery({
    variables: { roomId }
  });

  useEffect(() => {
    if (roomSubscriptionError) {
      toast({
        title: "Error",
        description: `Room subscription: ${roomSubscriptionError.message}`,
        variant: "destructive"
      });
    }
  }, [roomSubscriptionError, toast]);

  useEffect(() => {
    if (roomError) {
      toast({
        title: "Error",
        description: `Room: ${roomError.message}`,
        variant: "destructive"
      });
    }
  }, [roomError, toast]);

  const [joinRoomMutation, { data: joinRoomData }] = useJoinRoomMutation({
    onCompleted: (data) => {
      // console.log(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Join room: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (!roomData) return;

    const isNewRoom = sessionStorage.getItem("NEW_ROOM_CREATED") === "true";

    if (isNewRoom) {
      setOpenCreateUserDialog(true);
      sessionStorage.removeItem("NEW_ROOM_CREATED");
      return;
    }

    if (!user && roomData.roomById.users.length >= 0) {
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

      if (!roomStorage) {
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
          roomOwnerId: roomOwner
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

        if ((room.deck.cards as unknown as never[]).length < 1) {
          setOpenRoomOptionsDialog(true);
        }
      });

      isJoinRoomCalledRef.current = true;
    }
  }, [roomData, user, joinRoomMutation, roomId]);

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
            input: {
              roomId,
              cards: selectedCards.map(String)
            }
          }
        });
      }

      await joinRoomMutation({
        variables: {
          roomId: roomId,
          user: {
            id: user.id,
            username: user.username,
            roomName: roomName ?? null
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

  return (
    <div>
      {!room ? (
        <div className="flex h-screen items-center justify-center">
          <span className="text-lg font-semibold">Loading room...</span>
        </div>
      ) : (
        <>
          <PageLayout room={room} users={room.users}>
            <div className="flex flex-col items-center justify-between h-[calc(100vh-80px)] overflow-hidden">
              <Room room={room} />
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
