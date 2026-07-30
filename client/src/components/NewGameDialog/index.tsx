import { FC, useEffect, useState } from "react";

import { useToggleConfirmNewGameMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Room } from "@/types";

interface NewGameDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  room: Room;
  action: VoteStartAction;
  onConfirm: () => void;
}

export type VoteStartAction = "new-game" | "revote" | "next-queue-item";

const getDialogCopy = (action: VoteStartAction, room: Room) => {
  switch (action) {
    case "revote":
      return {
        title: "Start a revote?",
        description: room.currentIssueTitle
          ? `Start another voting pass for “${room.currentIssueTitle}”. The current result will remain as the original result in this round’s history.`
          : "Start another voting pass for this issue. The current result will remain as the original result in this round’s history.",
        confirmationText: "Start revote"
      };
    case "next-queue-item": {
      const nextIssueTitle = room.voteQueue[0]?.title;
      return {
        title: "Start the next queue item?",
        description: nextIssueTitle
          ? `Archive the current result and start voting on “${nextIssueTitle}”, the next item in the queue.`
          : "Archive the current result and start voting on the next item in the queue.",
        confirmationText: "Start next item"
      };
    }
    default:
      return {
        title: "Start a new game?",
        description:
          "Archive the current result, clear everyone’s selected cards, and start a blank voting round.",
        confirmationText: "Start new game"
      };
  }
};

/**
 * A reimagined confirmation dialog — sleek, minimal, and command-palette inspired.
 */
export const NewGameDialog: FC<NewGameDialogProps> = ({
  open,
  setOpen,
  room,
  action,
  onConfirm
}) => {
  const [toggleConfirmNewGame] = useToggleConfirmNewGameMutation();
  const [disableFutureConfirm, setDisableFutureConfirm] = useState(false);
  const dialogCopy = getDialogCopy(action, room);

  useEffect(() => {
    if (!room?.confirmNewGame) return;
    if (open) setDisableFutureConfirm(false);
  }, [open, room?.confirmNewGame]);

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
              {dialogCopy.title}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
              {dialogCopy.description}
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
              Don&apos;t show this confirmation again
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
              {dialogCopy.confirmationText}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
