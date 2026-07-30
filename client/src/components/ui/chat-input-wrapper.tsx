import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const ChatInput = lazy(() =>
  import("@/components/ui/chat-input").then(({ ChatInput: Input }) => ({
    default: Input
  }))
);

type Phase = "idle" | "enter-pre" | "enter" | "exit";

export const ChatInputWrapper = ({
  onSend,
  onClose,
  isOpen,
  anchorRef,
  isLeftSide = false,
  isTopSide = false
}: {
  onSend: (
    plain: string,
    formatted: string,
    position?: { x: number; y: number; width: number; height: number } | null
  ) => void;
  onClose: () => void;
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  isLeftSide?: boolean;
  isTopSide?: boolean;
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [phase, setPhase] = useState<Phase>("idle");
  const skipExitRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const animClasses = cn(
    phase === "enter-pre" && "opacity-0 -translate-y-2",
    phase === "enter" &&
      "animate-fade-slide-down [animation-fill-mode:forwards]",
    phase === "exit" && "animate-fade-slide-up   [animation-fill-mode:forwards]"
  );

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const wrapper = wrapperRef.current;
    if (!anchor || !wrapper) return;

    const anchorRect = anchor.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const width = wrapperRect.width || 220;
    const height = wrapperRect.height || 96;
    const gap = 12;
    const viewportMargin = 8;
    const roomOnLeft = anchorRect.left - viewportMargin;
    const roomOnRight = window.innerWidth - anchorRect.right - viewportMargin;

    let placeOnRight = !isLeftSide;
    const preferredRoom = placeOnRight ? roomOnRight : roomOnLeft;
    const alternateRoom = placeOnRight ? roomOnLeft : roomOnRight;

    if (preferredRoom < width + gap && alternateRoom > preferredRoom) {
      placeOnRight = !placeOnRight;
    }

    const desiredLeft = placeOnRight
      ? anchorRect.right + gap
      : anchorRect.left - width - gap;
    const desiredTop = anchorRect.top + (anchorRect.height - height) / 2;
    const maxLeft = Math.max(
      viewportMargin,
      window.innerWidth - width - viewportMargin
    );
    const maxTop = Math.max(
      viewportMargin,
      window.innerHeight - height - viewportMargin
    );
    const left = Math.min(Math.max(desiredLeft, viewportMargin), maxLeft);
    const top = Math.min(Math.max(desiredTop, viewportMargin), maxTop);

    wrapper.style.left = `${Math.round(left)}px`;
    wrapper.style.top = `${Math.round(top)}px`;
    wrapper.style.visibility = "visible";
  }, [anchorRef, isLeftSide]);

  useLayoutEffect(() => {
    if (!shouldRender) return;

    let frameId = 0;
    const followAnchor = () => {
      updatePosition();
      frameId = window.requestAnimationFrame(followAnchor);
    };

    frameId = window.requestAnimationFrame(followAnchor);
    return () => window.cancelAnimationFrame(frameId);
  }, [shouldRender, updatePosition]);

  if (!shouldRender || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={wrapperRef}
      className="fixed z-[99999]"
      style={{ left: 0, top: 0, visibility: "hidden" }}
      onAnimationEnd={handleAnimEnd}
    >
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="h-24 w-[220px] rounded-xl border border-border bg-popover/95"
          />
        }
      >
        <ChatInput
          onSend={handleSend}
          onClose={handleChildClose}
          className={animClasses}
          isLeftSide={isLeftSide}
          isTopSide={isTopSide}
        />
      </Suspense>
    </div>,
    document.body
  );
};
