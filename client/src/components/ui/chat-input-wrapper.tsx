// @ts-expect-error TS6133: React is declared but its value is never read.
import React, { useEffect, useRef, useState } from "react";
import { ChatInput } from "@/components/ui/chat-input";
import { cn } from "@/lib/utils";

type Phase = "idle" | "enter-pre" | "enter" | "exit";

export const ChatInputWrapper = ({
  onSend,
  onClose,
  className,
  isOpen,
  isLeftSide = false,
  isTopSide = false,
}: {
  onSend: (plain: string, formatted: string, position?: { x: number; y: number; width: number; height: number } | null) => void;
  onClose: () => void;
  className?: string;
  isOpen: boolean;
  isLeftSide?: boolean;
  isTopSide?: boolean;
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [phase, setPhase] = useState<Phase>("idle");
  const skipExitRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setPhase("enter-pre");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("enter"));
      });
    } else {
      setPhase("exit");
    }
  }, [isOpen]);

  const handleAnimEnd = () => {
    if (phase === "exit") {
      setShouldRender(false);
      setPhase("idle");
      onClose();
    } else if (phase === "enter") {
      setPhase("idle");
    }
  };

  const handleSend = (
    plain: string,
    formatted: string,
    position?: { x: number; y: number; width: number; height: number } | null
  ) => {
    skipExitRef.current = true;
    onSend(plain, formatted, position);
    setShouldRender(false);
    setPhase("idle");
    onClose();
  };

  const handleChildClose = () => {
    if (skipExitRef.current) {
      skipExitRef.current = false;
      return;
    }
    setPhase("exit");
  };

  if (!shouldRender) return null;

  const animClasses = cn(
    phase === "enter-pre" && "opacity-0 -translate-y-2",
    phase === "enter"     && "animate-fade-slide-down [animation-fill-mode:forwards]",
    phase === "exit"      && "animate-fade-slide-up   [animation-fill-mode:forwards]"
  );

  return (
    <div className={cn("absolute z-50", className)} onAnimationEnd={handleAnimEnd}>
      <ChatInput
        onSend={handleSend}
        onClose={handleChildClose}
        className={animClasses}
        isLeftSide={isLeftSide}
        isTopSide={isTopSide}
      />
    </div>
  );
};
