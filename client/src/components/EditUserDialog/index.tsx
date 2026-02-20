import {FC, FormEvent, useEffect, useState} from "react";
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
import {MAX_LEN} from "@/utils/enums.ts";

interface EditUserDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const EditUserDialog: FC<EditUserDialogProps> = ({ open, setOpen }) => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // Prefer the live user from context (keeps us in-sync), fallback to localStorage.
    if (user?.username) {
      setUsernameError(null);
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

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

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
      setUsername("");
      setUsernameError(null);
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

  const isSaveDisabled = loading || username.trim().length === 0;

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

        <form onSubmit={handleSubmit}>
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
                onChange={(e) => {
                  const raw = e.target.value;

                  // Allow letters, numbers, and spaces only
                  const allowedOnly = raw.replace(/[^a-zA-Z0-9 ]/g, "");

                  // Clamp what we actually store
                  const clamped = allowedOnly.slice(0, MAX_LEN.username);

                  // Detect what the user *tried* to do
                  const triedInvalidChar = raw !== allowedOnly;
                  const triedTooLong = allowedOnly.length > MAX_LEN.username;

                  if (triedInvalidChar) {
                    setUsernameError("Only letters, numbers, and spaces are allowed.");
                  } else if (triedTooLong) {
                    setUsernameError(`Username must be ${MAX_LEN.username} characters or less.`);
                  } else if (clamped.trim().length === 0) {
                    setUsernameError("Please enter a valid username")
                  } else {
                    setUsernameError(null);
                  }

                  setUsername(clamped);
                }}
                aria-invalid={!!usernameError}
                placeholder="Enter your new username"
                className={`
                  transition-all
                  focus:ring-2 focus:ring-accent focus:ring-offset-1
                  ${usernameError ? "border-destructive focus:ring-destructive" : ""}
                `}
              />
              {usernameError && (
                <p className="mt-1 text-sm text-destructive">
                  {usernameError}
                </p>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                className="text-sm font-medium px-3 py-1.5"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaveDisabled}
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
        </form>
      </DialogContent>
    </Dialog>
  );
};
