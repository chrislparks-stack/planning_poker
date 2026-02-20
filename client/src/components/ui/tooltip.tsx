import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

interface TooltipProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  disabled?: boolean;
}

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = ({
  disabled,
  open: openProp,
  onOpenChange,
  ...props
}: TooltipProps) => {
  const [open, setOpen] = React.useState(false);

  const isControlled = openProp !== undefined;
  const currentOpen = isControlled ? openProp : open;

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (!isControlled) setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <TooltipPrimitive.Root
      open={disabled ? false : currentOpen}
      onOpenChange={handleOpenChange}
      {...props}
    />
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // NOTE: z-[1000] is intentional and valid Tailwind
        "z-[1000] overflow-hidden rounded-md bg-accent px-3 py-1.5 text-xs text-primary-foreground",
        "animate-in fade-in-0 zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        "data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
