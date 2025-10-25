import { FC, useEffect, useState } from "react";
import { useCreateUserMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CardFan } from "@/components/ui/card-fan";
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
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>(DEFAULT_CARDS);

  useEffect(() => {
    if (roomData?.users) setUsers(roomData.users);
    if (roomData?.name) setRoomName(roomData.name);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="
          flex flex-col w-[90vw] max-w-[650px] max-h-[90vh]
          rounded-2xl backdrop-blur-md bg-background/80
          border border-border/50 shadow-[0_8px_32px_rgb(0_0_0_/_0.4)]
          p-0 overflow-hidden animate-in fade-in-0 zoom-in-95
        "
        noCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60" />

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {users.length > 0 ? "Join Room" : "Setup Room"}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* ===== Room Name (if first user) ===== */}
          {users.length < 1 && (
            <section className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 shadow-sm transition-colors">
              <h3 className="text-sm font-semibold">Room Name</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Set a custom name for this new room (optional)
              </p>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="mt-2"
              />
            </section>
          )}

          {/* ===== Username ===== */}
          <section className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 shadow-sm transition-colors">
            <h3 className="text-sm font-semibold">Username*</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter the name you’ll appear as in this room
            </p>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="mt-2"
            />
          </section>

          {/* ===== Card Selection (only for room creators) ===== */}
          {users.length < 1 && (
            <section className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 overflow-visible shadow-sm transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Card Selection</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose which poker cards this room will use
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <CardFan
                  selectedCards={selectedCards}
                  toggleCardSelection={toggleCardSelection}
                />
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t bg-card/60 backdrop-blur-sm shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            variant="default"
            className="ml-auto"
          >
            {loading
              ? "Creating..."
              : users.length > 0
                ? "Join Room"
                : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
