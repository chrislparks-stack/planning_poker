import {FC, FormEvent, useEffect, useState} from "react";
import { useCreateUserMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CardFan } from "@/components/ui/card-fan";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Room, User } from "@/types";
import {VisuallyHidden} from "@radix-ui/react-visually-hidden";
import {MAX_LEN} from "@/utils/enums.ts";
import {useNavigate} from "@tanstack/react-router";
import {House} from "lucide-react";

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
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [roomNameError, setRoomNameError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>(DEFAULT_CARDS);

  useEffect(() => {
    if (!open) return;

    setUsernameError(null);
    setRoomNameError(null);
  }, [open]);

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

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

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
        aria-label="Edit Username"
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
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}>
          {/* Accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60" />

          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {users.length > 0 ? "Join Room" : "Setup Room"}
            </DialogTitle>
          </DialogHeader>

          <VisuallyHidden>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Allows creating new rooms or adding user to room
            </DialogDescription>
          </VisuallyHidden>

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
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clamped = raw.slice(0, MAX_LEN.roomName);

                    if (raw.length > MAX_LEN.roomName) {
                      setRoomNameError(`Room name must be ${MAX_LEN.roomName} characters or less.`);
                    } else {
                      setRoomNameError(null);
                    }

                    setRoomName(clamped);
                  }}
                  aria-invalid={!!roomNameError}
                  placeholder="Enter room name"
                  className={`mt-2 ${
                    roomNameError ? "border-destructive focus:ring-destructive" : ""
                  }`}
                />

                {roomNameError && (
                  <p className="mt-1 text-sm text-destructive">{roomNameError}</p>
                )}
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
                onChange={(e) => {
                  const raw = e.target.value;

                  const allowedOnly = raw.replace(/[^a-zA-Z0-9 ]/g, "");
                  const clamped = allowedOnly.slice(0, MAX_LEN.username);

                  const triedInvalidChar = raw !== allowedOnly;
                  const triedTooLong = allowedOnly.length > MAX_LEN.username;

                  if (triedInvalidChar) {
                    setUsernameError("Only letters, numbers, and spaces are allowed.");
                  } else if (triedTooLong) {
                    setUsernameError(`Username must be ${MAX_LEN.username} characters or less.`);
                  } else if (clamped.trim().length === 0) {
                    setUsernameError("Username is required.");
                  } else {
                    setUsernameError(null);
                  }

                  setUsername(clamped);
                }}
                aria-invalid={!!usernameError}
                placeholder="Enter username"
                className={`mt-2 ${
                  usernameError ? "border-destructive focus:ring-destructive" : ""
                }`}
              />

              {usernameError && (
                <p className="mt-1 text-sm text-destructive">{usernameError}</p>
              )}
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
          <DialogFooter className="px-6 py-3 border-t bg-card/60 backdrop-blur-sm shrink-0 w-full flex !justify-between">
            <div>
              {users.length >= 1 && (
                <Button
                  type="button"
                  title="Go To Home"
                  variant="ghost"
                  className="border-accent-hover border-[1px]"
                  onClick={() => navigate({ to: "/" })}
                >
                  <House className="h-5 w-5"/>
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !canSubmit}
            >
              {loading
                ? "Creating..."
                : users.length > 0
                  ? "Join Room"
                  : "Create Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
