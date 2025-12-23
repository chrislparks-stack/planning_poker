import { ReloadIcon } from "@radix-ui/react-icons";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CountdownOverlayProps {
  seconds: number;
  title?: string;
  isRoomOwner?: boolean;
  onCancel?: () => void;
}

export function CountdownOverlay({
  seconds,
  title = "Revealing cards in...",
  isRoomOwner = false,
  onCancel
}: CountdownOverlayProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await onCancel?.();
    } finally {
      // keep spinner visible a short moment for smoother UX
      setTimeout(() => setIsCancelling(false), 800);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in relative">
      <div className="text-white text-2xl sm:text-3xl font-semibold mb-4 opacity-90 animate-fade-in-slow">
        {title}
      </div>

      <div
        key={seconds}
        className="text-white font-extrabold drop-shadow-[0_0_25px_rgba(255,255,255,0.7)]
        text-[6rem] sm:text-[10rem] animate-zoom-in"
      >
        {seconds}
      </div>

      {isRoomOwner && (
        <Button
          onClick={handleCancel}
          disabled={isCancelling}
          variant="secondary"
          size="lg"
          className="absolute bottom-12 text-base font-semibold bg-white/20 hover:bg-white/30 
          text-white backdrop-blur-md transition-all duration-300 border border-white/40"
        >
          {isCancelling ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Canceling...
            </>
          ) : (
            "Cancel Countdown"
          )}
        </Button>
      )}
    </div>
  );
}
