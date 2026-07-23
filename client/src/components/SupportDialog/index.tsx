import { Coffee } from "lucide-react";
import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { OptionDialogContent } from "@/components/ui/option-dialog-content";

interface SupportDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const SupportDialog: FC<SupportDialogProps> = ({ open, setOpen }) => {
  const [accordionValue, setAccordionValue] = useState<string>("");
  const [delayedFade, setDelayedFade] = useState(true);
  const [descHeight, setDescHeight] = useState(120);
  const descRef = useRef<HTMLDivElement>(null);
  const isOpen = accordionValue === "tip";

  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;

    const ignorePatterns = [
      "ko-fi.com",
      "crispyasian/?hidefeed",
      "preloaded using link preload"
    ];

    const shouldIgnore = (args: unknown[]): boolean => {
      const joined = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ");
      return ignorePatterns.some((p) => joined.includes(p));
    };

    console.error = (...args) => {
      if (!shouldIgnore(args)) origError(...args);
    };
    console.warn = (...args) => {
      if (!shouldIgnore(args)) origWarn(...args);
    };

    return () => {
      console.error = origError;
      console.warn = origWarn;
    };
  }, []);

  // Measure true full height of description
  useLayoutEffect(() => {
    if (descRef.current) {
      // Temporarily remove overflow restriction for precise measurement
      const el = descRef.current;
      const prev = el.style.overflow;
      el.style.overflow = "visible";
      const height = el.scrollHeight + 8;
      el.style.overflow = prev;
      setDescHeight(height);
    }
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAccordionValue("");
      setDelayedFade(true);
    }
  }, [open]);

  // Fade timing sync with accordion
  useEffect(() => {
    if (!isOpen) {
      const showTimer = setTimeout(() => setDelayedFade(true), 300);
      return () => clearTimeout(showTimer);
    } else {
      const hideTimer = setTimeout(() => setDelayedFade(false), 40);
      return () => clearTimeout(hideTimer);
    }
  }, [isOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <OptionDialogContent
        data-testid="support-dialog"
        className="max-w-[640px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-accent via-accent/85 to-accent/35" />

        <DialogHeader className="shrink-0 border-b border-border/60 bg-card/30 px-5 py-4 text-left sm:px-6 sm:py-5">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-sm">
              <Coffee aria-hidden="true" className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Support the developer
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed">
                Help support continued development of Summit Planning Poker.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Collapsible description wrapper */}
          <div
            style={{
              maxHeight: delayedFade && !isOpen ? `${descHeight + 8}px` : "0px",
              height: `${descHeight}px`,
              overflow: "clip",
              borderBottomLeftRadius: "inherit",
              borderBottomRightRadius: "inherit",
              marginBottom: delayedFade && !isOpen ? "1rem" : "0rem",
              transition: isOpen
                ? "max-height 0.45s cubic-bezier(0.55,0,0.85,0.35), margin-bottom 0.3s ease-out"
                : "max-height 0.9s cubic-bezier(0.25,0.1,0.25,1), margin-bottom 0.9s ease-in-out"
            }}
          >
            <div
              ref={descRef}
              style={{
                opacity: delayedFade && !isOpen ? 1 : 0,
                transform:
                  delayedFade && !isOpen ? "translateY(0)" : "translateY(4px)",
                transition: isOpen
                  ? "opacity 0.25s cubic-bezier(0.5,0,0.75,0.35), transform 0.25s ease-out"
                  : "opacity 0.8s cubic-bezier(0.25,0.1,0.25,1), transform 0.8s ease-in-out"
              }}
              className="rounded-xl border border-border/55 bg-card/45 p-4"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                This project runs on caffeine, curiosity, and late-night coding.
                If you’d like to support continued development, you can tip the
                developer below or visit{" "}
                <a
                  href="https://ko-fi.com/crispyasian"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent hover:underline"
                >
                  my Ko-fi page
                </a>
                .
              </p>
              <p className="text-sm mt-3 text-muted-foreground italic">
                Tips are entirely optional — your time and feedback mean just as
                much.
              </p>
            </div>
          </div>

          {/* Accordion directly follows with no spacing issues */}
          <Accordion
            type="single"
            collapsible
            value={accordionValue}
            onValueChange={(val) => setAccordionValue(val ?? "")}
            className="w-full"
          >
            <AccordionItem
              value="tip"
              className="overflow-hidden rounded-xl border border-border/55 bg-card/45"
            >
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold justify-center hover:no-underline focus:outline-none focus:ring-0 transition-all duration-700">
                {isOpen ? "Close Tip Panel" : "Tip Here!"}
              </AccordionTrigger>

              <div
                style={{
                  maxHeight: isOpen ? "600px" : "0px",
                  opacity: isOpen ? 1 : 0,
                  overflow: "hidden",
                  transition:
                    "max-height 1s cubic-bezier(0.45,0,0.25,1), opacity 0.8s cubic-bezier(0.45,0,0.25,1)"
                }}
                className="flex justify-center"
              >
                <div
                  style={{
                    transition: "opacity 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)",
                    opacity: isOpen ? 1 : 0
                  }}
                  className="w-full max-w-[560px]"
                >
                  <iframe
                    src="https://ko-fi.com/crispyasian/?hidefeed=true&widget=true"
                    loading="lazy"
                    title="Ko-fi Tip Widget"
                    width="100%"
                    height="550"
                    className="rounded-md border border-border shadow-sm"
                    allow="payment *"
                  />
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-card/45 px-5 py-3.5 sm:px-6">
          <Button
            onClick={() => setOpen(false)}
            variant="default"
            className="ml-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </OptionDialogContent>
    </Dialog>
  );
};
