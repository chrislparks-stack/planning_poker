import { FC, useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Room } from "@/types";
import { useToggleConfirmNewGameMutation } from "@/api";

interface NewGameDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    room: Room;
    onConfirm: () => void;
}

/**
 * A reimagined confirmation dialog — sleek, minimal, and command-palette inspired.
 */
export const NewGameDialog: FC<NewGameDialogProps> = ({
    open,
    setOpen,
    room,
    onConfirm
}) => {
  const [toggleConfirmNewGame] = useToggleConfirmNewGameMutation();
  const [disableFutureConfirm, setDisableFutureConfirm] = useState(false);

  if (!room?.confirmNewGame) return null;

  useEffect(() => {
    if (open) setDisableFutureConfirm(false);
  }, [open]);

  const handleConfirm = async () => {
    if (disableFutureConfirm) {
      try {
        await toggleConfirmNewGame({
          variables: { roomId: room.id, enabled: false }
        });
      } catch (err) {
        console.error("toggleConfirmNewGame failed:", err);
      }
    }
    onConfirm();
    setOpen(false);
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
        <div className="px-6 py-5 space-y-4 relative">
          <div>
            <DialogTitle className="text-lg font-semibold tracking-tight">
                Start a new game?
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
            This will reset the current round and clear everyone's selected cards
            </DialogDescription>
          </div>
          <div className="relative">
            <label
              htmlFor="disableConfirm"
              className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none group"
            >
              <input
                id="disableConfirm"
                type="checkbox"
                checked={disableFutureConfirm}
                onChange={(e) => setDisableFutureConfirm(e.target.checked)}
                className="
                  h-4 w-4 rounded-sm border-muted-foreground/40
                  accent-accent cursor-pointer
                  group-hover:scale-[1.05] transition-transform
                "
              />
              Don't show this confirmation again
            </label>

            {/* Helper text appears over reserved space to avoid shifting buttons */}
            <div
              className="
                relative h-5 mt-1 pl-6
                text-xs text-muted-foreground/70
              "
            >
              <span
                className={`
                  absolute left-0 top-0 transition-opacity duration-500 ease-out
                  ${disableFutureConfirm ? "opacity-100" : "opacity-0"}
                `}
              >
                You can re-enable this feature anytime in the Room Options
              </span>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="text-sm font-medium px-3"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="
                text-sm font-semibold px-4
                transition-all duration-200
                hover:shadow-[0_0_10px_var(--accent)]
                hover:-translate-y-[1px]
              "
            >
              Start new game
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
