import { useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import {
  useGetRoomQuery,
  useJoinRoomMutation,
  useRoomSubscription,
  useSetRoomOwnerMutation,
  useUpdateDeckMutation,
} from "@/api";
import { CreateUserDialog } from "@/components/CreateUserDialog";
import { Deck } from "@/components/Deck";
import { PageLayout } from "@/components/PageLayout";
import { Room } from "@/components/Room";
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

  const { data: subscriptionData, error: roomSubscriptionError } = useRoomSubscription({
    variables: { roomId },
  });

  const { data: roomData, error: roomError } = useGetRoomQuery({
    variables: { roomId },
  });

  useEffect(() => {
    if (roomSubscriptionError) {
      toast({
        title: "Error",
        description: `Room subscription: ${roomSubscriptionError.message}`,
        variant: "destructive",
      });
    }
  }, [roomSubscriptionError, toast]);

  useEffect(() => {
    if (roomError) {
      toast({
        title: "Error",
        description: `Room: ${roomError.message}`,
        variant: "destructive",
      });
    }
  }, [roomError, toast]);

  const [joinRoomMutation, { data: joinRoomData }] = useJoinRoomMutation({
    onError: (error) => {
      toast({
        title: "Error",
        description: `Join room: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user && !isJoinRoomCalledRef.current) {
      joinRoomMutation({
        variables: {
          roomId,
          user: {
            id: user.id,
            username: user.username,
          },
        },
      });

      const roomStorage = JSON.parse(localStorage.getItem("Room"));

      if (roomStorage) {
        setRoomOwner({
          variables: {
            roomId: roomId,
            userId: roomStorage.RoomOwner,
          },
        });
      }

      isJoinRoomCalledRef.current = true;
    }
  }, [joinRoomMutation, roomId, user]);

  async function handleJoinRoomMutation(user: User, selectedCards: (string | number)[], roomOwnerId?: string) {
    try {
      if (!localStorage.getItem("Room")) {
        const roomData = {
          RoomID: roomId,
          Cards: selectedCards,
          RoomOwner: roomOwnerId ?? null,
        };

        localStorage.setItem("Room", JSON.stringify(roomData));

        await updateDeck({
          variables: {
            input: {
              roomId,
              cards: selectedCards.map(String),
            },
          },
        });
      }

      await joinRoomMutation({
        variables: {
          roomId: roomId,
          user: { id: user.id, username: user.username },
        },
      }).then(() => {
        if (roomOwnerId) {
          setRoomOwner({
            variables: {
              roomId: roomId,
              userId: roomOwnerId,
            },
          });
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Something went wrong while joining: ${error}`,
        variant: "destructive",
      });
    }
  }

  const room = subscriptionData?.room ?? roomData?.roomById ?? joinRoomData?.joinRoom;

  return (
    <div>
      {!room ? (
        <div className="flex h-screen items-center justify-center">
          <span className="text-lg font-semibold">Loading room...</span>
        </div>
      ) : (
        <>
          <PageLayout room={room} users={room.users}>
            <Room room={room} />
            <div className="absolute left-0 right-0 bottom-4 mx-auto my-0 max-w-4xl overflow-auto">
              {room.isGameOver ? (
                <div className="flex justify-center">
                  <VoteDistributionChart room={room} />
                </div>
              ) : (
                <Deck roomId={roomId} isGameOver={room.isGameOver} cards={room.deck.cards} table={room.game.table} />
              )}
            </div>
          </PageLayout>
          <CreateUserDialog
            roomData={room}
            onJoin={(user, selectedCards, roomOwner?) =>
              roomOwner
                ? handleJoinRoomMutation(user, selectedCards, roomOwner)
                : handleJoinRoomMutation(user, selectedCards)
            }
          />
        </>
      )}
    </div>
  );
}
