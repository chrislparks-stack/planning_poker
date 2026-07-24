import { LogOut } from "lucide-react";
import { FC, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { OptionDialogContent } from "@/components/ui/option-dialog-content";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Room, User } from "@/types";

interface ConfirmLogoutDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  room?: Room | null;
}

export const ConfirmLogoutDialog: FC<ConfirmLogoutDialogProps> = ({
  open,
  setOpen,
  onConfirm,
  room
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isOwner = useMemo(() => {
    if (!room || !user) return false;
    return String(room.roomOwnerId) === String(user.id);
  }, [room, user]);

  const otherUsers = useMemo<User[]>(() => {
    if (!room || !Array.isArray(room.users)) return [];
    return room.users.filter((roomUser) => String(roomUser.id) !== user?.id);
  }, [room, user]);

  const nextOwner = otherUsers[0];
  const isLastUser = (room?.users?.length ?? 0) <= 1;

  const handleClose = () => {
    if (!loading) setOpen(false);
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
      onOpenChange={(nextOpen) => {
        if (!nextOpen && loading) return;
        setOpen(nextOpen);
      }}
    >
      <OptionDialogContent
        data-testid="confirm-logout-dialog"
        className="max-w-[500px]"
        onInteractOutside={(event) => {
          if (loading) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-accent via-accent/85 to-accent/35" />

        <DialogHeader className="shrink-0 border-b border-border/60 bg-card/30 px-5 py-4 text-left sm:px-6 sm:py-5">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-sm">
              <LogOut aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Sign out
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed">
                End this session and return to the sign-in screen.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl border border-border/55 bg-card/45 p-4">
            <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
              Note
            </span>
            <p className="m-0 text-xs leading-relaxed text-muted-foreground">
              {isOwner && isLastUser
                ? "Because you’re the last person in this room, leaving will remove it. Returning later with the same room ID will ask you to set it up again."
                : "If you just need a break, signing out won’t delete your rooms or history."}
            </p>
          </div>

          {isOwner && nextOwner && (
            <div
              className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3"
              role="status"
            >
              <Avatar className="size-9">
                <AvatarFallback>
                  {String(nextOwner.username?.[0] ?? "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="mb-0 text-xs leading-relaxed text-muted-foreground">
                  Room ownership will be passed to:
                </p>
                <p
                  className="mt-1 truncate text-sm font-semibold text-accent"
                  title={nextOwner.username}
                >
                  {nextOwner.username}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border/60 bg-card/45 px-5 py-3.5 sm:px-6">
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
            onClick={() => void handleConfirm()}
            disabled={loading}
            aria-label="Confirm sign out"
          >
            <LogOut
              aria-hidden="true"
              className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Signing out…" : "Sign out"}
          </Button>
        </DialogFooter>
      </OptionDialogContent>
    </Dialog>
  );
};
