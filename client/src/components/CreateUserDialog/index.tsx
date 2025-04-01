import { FC, useEffect, useState } from "react";

import { useCreateUserMutation } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";

interface CreateUserDialogProps {
  onJoin: (user: User, selectedCards: (string | number)[]) => void;
}

const DEFAULT_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, "?", "∞", "☕"];

export const CreateUserDialog: FC<CreateUserDialogProps> = ({ onJoin }) => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [open, setOpen] = useState<boolean>(user ? !Boolean(user) : true);
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>([
    1, 2, 3, 5, 8, 13,
  ]);

  useEffect(() => {
    if (user) {
      setOpen(!Boolean(user));
    } else {
      setOpen(true);
    }
  }, [setOpen, user]);

  const [createUserMutation, { loading }] = useCreateUserMutation({
    onCompleted: (data) => {
      login?.({
        id: data.createUser.id,
        username: data.createUser.username,
      });
      setOpen(false);
      onJoin(data.createUser, selectedCards);
      toast({
        title: "User created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleCardSelection = (card: string | number) => {
    setSelectedCards((prev) =>
      prev.includes(card) ? prev.filter((c) => c !== card) : [...prev, card],
    );
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    await createUserMutation({
      variables: {
        username: username.trim(),
      },
    });
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter your username</AlertDialogTitle>
          <AlertDialogDescription>
            Enter your username to join the room.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <div className="relative h-48 w-full overflow-visible">
          <p className="mb-2">Pick poker cards to use:</p>
          <div className="flex justify-center items-baseline">
            {DEFAULT_CARDS.map((card, index) => {
              const total = DEFAULT_CARDS.length;
              const middle = (total - 1) / 2;
              const offset = index - middle;

              const rotate = offset * 5.5;
              const spacing = 42;
              const translateX = offset * spacing;

              const arcStrength = 2.2;
              const arc = Math.pow(offset, 2) * arcStrength;

              return (
                <button
                  key={card}
                  onClick={() => toggleCardSelection(card)}
                  className={`absolute w-12 h-20 rounded-md text-sm font-semibold transition-transform duration-300 ease-out
            flex items-center justify-center shadow-md
            ${
              selectedCards.includes(card)
                ? "bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
                : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
            }`}
                  style={{
                    transform: `translateX(${translateX}px) translateY(${arc}px) rotate(${rotate}deg)`,
                    zIndex: 1000 - Math.abs(offset),
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", // 💫 subtle depth
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `translateX(${translateX}px) translateY(${
                      arc - 20
                    }px) rotate(${rotate}deg) scale(1.05)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `translateX(${translateX}px) translateY(${arc}px) rotate(${rotate}deg)`;
                  }}
                >
                  {card}
                </button>
              );
            })}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Join room"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
