import { LogOut } from "lucide-react";
import { FC, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Room, User } from "@/types";

interface ConfirmLogoutDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Called when user confirms logout. Can be async. */
  onConfirm: () => void | Promise<void>;
  /** Optional room context used to show ownership-transfer messaging */
  room?: Room | null;
}

export const ConfirmLogoutDialog: FC<ConfirmLogoutDialogProps> = ({
  open,
  setOpen,
  onConfirm,
  room
}) => {
  const { toast } = useToast();
  const { user } = useAuth(); // may be undefined
  const [loading, setLoading] = useState(false);

  const isOwner = useMemo(() => {
    if (!room || !user) return false;
    return String(room.roomOwnerId) === String(user.id);
  }, [room, user]);

  const otherUsers = useMemo<User[]>(() => {
    if (!room || !Array.isArray(room.users)) return [];
    return room.users.filter((u) => String(u.id) !== String(user?.id));
  }, [room, user]);

  const nextOwner: User | undefined =
    otherUsers.length > 0 ? otherUsers[0] : undefined;

  const userCount = room?.users?.length ?? 0;
  const isLastUser = userCount <= 1;

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully."
      });
      setOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Logout failed:", err);
      toast({
        title: "Sign out failed",
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return;
        setOpen(next);
      }}
    >
      <DialogContent
        className="
          flex flex-col w-[90vw] max-w-[480px] max-h-[90vh]
          rounded-2xl backdrop-blur-md bg-background/80
          border border-border/50 shadow-[0_8px_32px_rgb(0_0_0_/_0.4)]
          p-0 animate-in fade-in-0 zoom-in-95
        "
        onInteractOutside={(e) => {
          if (loading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60 shrink-0" />

        {/* Scrollable main content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-lg">Sign out</DialogTitle>

                <DialogDescription asChild>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We’ll save your place. Signing out ends this session — you can
                    sign back in anytime to return to your rooms and settings.
                  </p>
                </DialogDescription>
              </div>

              <div className="flex items-start gap-2">
          <span
            className="inline-block rounded px-2 py-0.5 text-xs font-medium flex-shrink-0"
            style={{
              backgroundColor: "hsl(var(--accent) / 0.08)",
              color: "hsl(var(--accent))"
            }}
          >
            Tip
          </span>

                <p className="text-xs text-muted-foreground m-0">
                  {isOwner && isLastUser ? (
                    <>
                      Because you’re the last person in this room, leaving will
                      remove it. Returning later with the same room ID will ask
                      you to set it up again.
                    </>
                  ) : (
                    <>
                      If you just need a break, signing out won’t delete your
                      rooms or history.
                    </>
                  )}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* ownership handoff card */}
          {isOwner && nextOwner && (
              <div className="mt-4">
                <div
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                  style={{
                    backgroundColor: "hsl(var(--accent) / 0.06)",
                    borderColor: "hsl(var(--accent) / 0.28)"
                  }}
                  role="status"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {String(nextOwner.username?.[0] ?? "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0">
                      Heads up — as the room owner, ownership will be passed to:
                    </p>
                    <p
                      className="mt-1 text-sm font-medium truncate"
                      style={{ color: "hsl(var(--accent))" }}
                      title={nextOwner.username}
                    >
                      {nextOwner.username}
                    </p>
                  </div>
                </div>
              </div>
          )}
        </div>

        {/* Fixed footer */}
        <DialogFooter className="px-6 py-3 border-t bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex w-full justify-end gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
              aria-label="Cancel sign out"
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
              aria-label="Confirm sign out"
            >
              {loading ? (
                <>
                  <LogOut className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
