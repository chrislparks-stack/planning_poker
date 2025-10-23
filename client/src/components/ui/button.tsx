import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Button variants updated to use accent token utilities.
 *
 * Requirements:
 * - tailwind.config.js must expose accent / accent-hover / accent-active / accent-foreground tokens
 *   (e.g. accent: hslVar("--accent"), "accent-hover": hslVar("--accent-hover"), etc.)
 * - index.css should guarantee --accent-hover / --accent-active exist (or fallback to --accent)
 * - Dev server restart required after tailwind.config changes
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          // primary uses primary tokens (unchanged). Add subtle accent ring on focus for consistency.
          "bg-accent text-primary-foreground shadow hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent/40",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/30",
        outline:
          // outline buttons use accent on hover and when toggled/selected;
          // active state uses accent-active, persistent toggles use data-[state=on]
          "border border-input bg-background shadow-sm hover:bg-accent-hover hover:text-accent-foreground active:bg-accent-active data-[state=on]:bg-accent data-[state=on]:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent/40",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-secondary/30",
        ghost:
          // ghost buttons become accent on hover and when selected
          "bg-transparent hover:bg-accent-hover hover:text-accent-foreground active:bg-accent-active data-[state=on]:bg-accent data-[state=on]:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent/40",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
