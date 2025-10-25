import { FC, useEffect, useState } from "react";
import { useEditUserMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";

interface EditUserDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const EditUserDialog: FC<EditUserDialogProps> = ({ open, setOpen }) => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!open) return;

    // Prefer the live user from context (keeps us in-sync), fallback to localStorage.
    if (user?.username) {
      setUsername(user.username);
      return;
    }

    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      setUsername(parsed?.username ?? "");
    } catch (err) {
      console.warn("Failed to parse username from localStorage:", err);
      setUsername("");
    }
  }, [open, user]);

  const [editUserMutation, { loading }] = useEditUserMutation({
    onCompleted: (data) => {
      // mutation only runs when the username has actually changed, so this is a true update
      login?.({
        id: data.editUser.id,
        username: data.editUser.username,
      });
      setOpen(false);

      toast({
        title: "Username updated",
        description: "Your username has been successfully changed",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    const trimmed = username.trim();

    if (!trimmed) {
      toast({
        title: "Username required",
        description: "Please enter a valid username",
        variant: "destructive",
      });
      return;
    }

    if (user && trimmed === (user.username ?? "")) {
      setOpen(false);
      return;
    }

    if (user) {
      await editUserMutation({
        variables: {
          userId: user.id,
          username: trimmed,
        },
      });
    } else {
      toast({
        title: "Not signed in",
        description: "Please sign in before updating your username",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="
          sm:max-w-[420px]
          rounded-2xl
          backdrop-blur-md
          bg-background/80
          border border-border/50
          shadow-[0_8px_32px_rgb(0_0_0_/_0.4)]
          p-0 overflow-hidden
          animate-in fade-in-0 zoom-in-95
        "
      >
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60" />

        {/* Inner content */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Update Your Username
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
              This name will appear to others in your current room
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your new username"
              className="transition-all focus:ring-2 focus:ring-accent focus:ring-offset-1"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-3">
            <Button
              variant="ghost"
              className="text-sm font-medium px-3 py-1.5"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="
                text-sm font-semibold px-4 py-1.5
                transition-all duration-200
                hover:shadow-[0_0_10px_var(--accent)]
                hover:-translate-y-[1px]
              "
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
