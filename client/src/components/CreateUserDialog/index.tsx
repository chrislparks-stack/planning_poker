import { FC, useEffect, useState } from "react";

import { useCreateUserMutation } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { CardFan } from "@/components/ui/card-fan.tsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Room, User } from "@/types";

interface CreateUserDialogProps {
  roomData: Room;
  onJoin: (
    user: User,
    selectedCards?: (string | number)[],
    roomOwner?: string | null,
    roomName?: string | null
  ) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DEFAULT_CARDS = [0, 0.5, 1, 2, 3, 5, 8, 13, 21, "?", "☕"];

export const CreateUserDialog: FC<CreateUserDialogProps> = ({
  roomData,
  onJoin,
  open,
  setOpen
}) => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [roomName, setRoomName] = useState("");
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>([
    1, 2, 3, 5, 8, 13
  ]);

  useEffect(() => {
    if (roomData?.users) setUsers(roomData.users);
  }, [roomData]);

  const canSubmit =
    username.trim().length > 0 &&
    (users.length > 0 || selectedCards.length > 0);

  const [createUserMutation, { loading }] = useCreateUserMutation({
    onCompleted: (data) => {
      const sortedSelectedCards = [...selectedCards].sort(
        (a, b) =>
          DEFAULT_CARDS.findIndex((card) => card === a) -
          DEFAULT_CARDS.findIndex((card) => card === b)
      );

      login?.({
        id: data.createUser.id,
        username: data.createUser.username
      });

      setOpen(false);

      if (users.length < 1) {
        onJoin(
          data.createUser,
          sortedSelectedCards,
          data.createUser.id,
          roomName !== "" ? roomName : null
        );
      } else {
        onJoin(
          data.createUser,
          roomData.deck.cards,
          roomData.roomOwnerId,
          roomData.name
        );
      }

      toast({
        title: "User created successfully",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const toggleCardSelection = (card: string | number) => {
    setSelectedCards((prev) =>
      prev.includes(card) ? prev.filter((c) => c !== card) : [...prev, card]
    );
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive"
      });
      return;
    }

    if (selectedCards.length < 1) {
      toast({
        title: "Error",
        description: "You must have at least one card selected",
        variant: "destructive"
      });
      return;
    }

    await createUserMutation({
      variables: {
        username: username.trim()
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Setup Room</AlertDialogTitle>
          <AlertDialogDescription>* Required</AlertDialogDescription>
        </AlertDialogHeader>
        {users.length < 1 && (
          <div className="grid gap-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="roomName">Room Name (Optional)</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
        )}
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="username">Username*</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        {users.length < 1 && (
          <div className="relative z-10 overflow-visible">
            <CardFan
              selectedCards={selectedCards}
              toggleCardSelection={toggleCardSelection}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
          >
            {loading
              ? "Creating..."
              : users.length > 0
              ? "Join Room"
              : "Create Room"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
