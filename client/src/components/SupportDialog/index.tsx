import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent, DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import {VisuallyHidden} from "@radix-ui/react-visually-hidden";

interface SupportDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const SupportDialog: FC<SupportDialogProps> = ({ open, setOpen }) => {
  const [accordionValue, setAccordionValue] = useState<string>("");
  const [delayedFade, setDelayedFade] = useState(true);
  const [descHeight, setDescHeight] = useState(120);
  const descRef = useRef<HTMLDivElement>(null);
  const isOpen = accordionValue === "donate";

  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;

    const ignorePatterns = [
      "ko-fi.com",
      "crispyasian/?hidefeed",
      "preloaded using link preload"
    ];

    const shouldIgnore = (args: any[]): boolean => {
      const joined = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      return ignorePatterns.some(p => joined.includes(p));
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
      <DialogContent
        className="
          flex flex-col w-[90vw] max-w-[620px] max-h-[88vh]
          rounded-2xl backdrop-blur-md bg-background/85
          border border-border/50 shadow-[0_8px_32px_rgb(0_0_0_/_0.35)]
          p-0 overflow-hidden animate-in fade-in-0 zoom-in-95
        "
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60" />

        <VisuallyHidden>
          <DialogDescription>
            Ko-fi support page for anyone who like to contribute
          </DialogDescription>
        </VisuallyHidden>

        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Support the Developer
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 px-6 py-5 overflow-y-auto">

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
                : "max-height 0.9s cubic-bezier(0.25,0.1,0.25,1), margin-bottom 0.9s ease-in-out",
            }}
          >
          <div
              ref={descRef}
              style={{
                opacity: delayedFade && !isOpen ? 1 : 0,
                transform: delayedFade && !isOpen ? "translateY(0)" : "translateY(4px)",
                transition: isOpen
                  ? "opacity 0.25s cubic-bezier(0.5,0,0.75,0.35), transform 0.25s ease-out"
                  : "opacity 0.8s cubic-bezier(0.25,0.1,0.25,1), transform 0.8s ease-in-out",
              }}
              className="rounded-lg border bg-card/60 backdrop-blur-sm p-4 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                This project runs on caffeine, curiosity, and late-night coding.
                If you’d like to support continued development, you can donate
                below or visit{" "}
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
                Donations are entirely optional — your time and feedback mean just as much.
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
              value="donate"
              className="rounded-lg border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden"
            >
              <AccordionTrigger
                className="px-4 py-3 text-sm font-semibold justify-center hover:no-underline focus:outline-none focus:ring-0 transition-all duration-700"
              >
                {isOpen ? "Close Donation Panel" : "Donate Here!"}
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
                    title="Ko-fi Donation Widget"
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

        <DialogFooter className="px-6 py-3 border-t bg-card/60 backdrop-blur-sm shrink-0">
          <Button onClick={() => setOpen(false)} variant="default" className="ml-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
