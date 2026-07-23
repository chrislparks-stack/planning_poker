import { UserRound } from "lucide-react";
import { FC, FormEvent, useEffect, useState } from "react";

import { useEditUserMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionDialogContent } from "@/components/ui/option-dialog-content";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { MAX_LEN } from "@/utils/enums.ts";

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
        handRaised: data.editUser.handRaised
      });
      setOpen(false);

      toast({
        title: "Username updated",
        description: "Your username has been successfully changed"
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    const trimmed = username.trim();

    if (!trimmed) {
      toast({
        title: "Username required",
        description: "Please enter a valid username",
        variant: "destructive"
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
          username: trimmed
        }
      });
    } else {
      toast({
        title: "Not signed in",
        description: "Please sign in before updating your username",
        variant: "destructive"
      });
    }
  };

  const isSaveDisabled = loading || username.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <OptionDialogContent
        data-testid="edit-user-dialog"
        className="max-w-[480px]"
      >
        <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-accent via-accent/85 to-accent/35" />

        <DialogHeader className="shrink-0 border-b border-border/60 bg-card/30 px-5 py-4 text-left sm:px-6 sm:py-5">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-sm">
              <UserRound aria-hidden="true" className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Change username
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed">
                Update the name everyone sees in the current room.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <section className="rounded-xl border border-border/55 bg-card/45 p-4">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Use letters, numbers, and spaces.
              </p>
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
                    setUsernameError(
                      "Only letters, numbers, and spaces are allowed."
                    );
                  } else if (triedTooLong) {
                    setUsernameError(
                      `Username must be ${MAX_LEN.username} characters or less.`
                    );
                  } else if (clamped.trim().length === 0) {
                    setUsernameError("Please enter a valid username");
                  } else {
                    setUsernameError(null);
                  }

                  setUsername(clamped);
                }}
                aria-invalid={!!usernameError}
                placeholder="Enter your new username"
                className={`
                  mt-3 h-10 bg-background/65 transition-all
                  focus:ring-2 focus:ring-accent focus:ring-offset-1
                  ${
                    usernameError
                      ? "border-destructive focus:ring-destructive"
                      : ""
                  }
                `}
              />
              {usernameError && (
                <p className="mt-2 text-xs text-destructive">{usernameError}</p>
              )}
            </section>
          </div>

          <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border/60 bg-card/45 px-5 py-3.5 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaveDisabled}>
              {loading ? "Saving…" : "Save username"}
            </Button>
          </DialogFooter>
        </form>
      </OptionDialogContent>
    </Dialog>
  );
};
