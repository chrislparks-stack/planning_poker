import { FC } from "react";

import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Card: FC<ButtonProps> = ({ children, className, ...props }) => {
  const value = typeof children === "string" ? children : "";

  let subLabel: string | null = null;

  if (value === "?") {
    subLabel = "Undecided";
  } else if (value === "☕") {
    subLabel = "Break Time";
  }

  return (
    <Button
      className={cn(
        "relative h-20 min-w-[52px] text-xl py-6 px-3 border-2 border-gray-500 leading-normal",
        className,
      )}
      variant="outline"
      {...props}
    >
      <span>{children}</span>

      {subLabel && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-foreground/80 font-normal tracking-wide">
          {subLabel}
        </span>
      )}
    </Button>
  );
};

