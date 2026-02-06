import * as React from "react";
import { cn } from "@/lib/utils";

const SWITCH_SIZES = {
  sm: {
    trackWidth: 91,
    trackHeight: 35,
    knobSize: 25,
  },
  md: {
    trackWidth: 118,
    trackHeight: 48,
    knobSize: 38,
  },
  lg: {
    trackWidth: 140,
    trackHeight: 56,
    knobSize: 44,
  },
} as const;

const LABEL_GEOMETRY = {
  sm: {
    fontClass: "text-[12px]",
    inset: "13%",
    translate: 23,
  },
  md: {
    fontClass: "text-xs",
    inset: "20%",
    translate: 34,
  },
  lg: {
    fontClass: "text-sm",
    inset: "22%",
    translate: 40,
  },
} as const;

export interface SwitchProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    labels?: [string, string];
    size?: "sm" | "md" | "lg";
}

/**
 * Chunky tactile switch
 */
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      className,
      disabled,
      labels = ["Disabled", "Enabled"],
      size = "lg",
      ...props
    },
    ref
  ) => {
    const { trackWidth, trackHeight, knobSize } = SWITCH_SIZES[size];
    const padding = (trackHeight - knobSize) / 2;
    const knobTravel = trackWidth - knobSize - padding * 2 - 2;

    const { fontClass, inset, translate } = LABEL_GEOMETRY[size];

    const handleClick = () => {
        if (!disabled) {
            onCheckedChange(!checked);
        }
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        ref={ref as React.RefObject<HTMLButtonElement>}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
            "relative inline-flex select-none items-center justify-center rounded-full border font-semibold text-sm",
            "transition-colors duration-500 ease-&lsqb;cubic-bezier(0.22,1,0.36,1)&rsqb",
            checked
                ? "bg-accent border-accent text-accent-foreground shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_0_10px_rgba(0,0,0,0.4)]"
                : "bg-zinc-300/80 dark:bg-zinc-800/70 border-zinc-400/50 dark:border-zinc-600/40 text-zinc-900 dark:text-zinc-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)]",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}
        style={{
            width: `${trackWidth}px`,
            height: `${trackHeight}px`,
        }}
        {...props}
      >
        {/* Cross-fading labels */}
        <span
          className={cn(
            "absolute z-0 text-background font-medium select-none pointer-events-none",
            fontClass
          )}
          style={{
            opacity: checked ? 0 : 1,
            transform: `translateX(${checked ? -translate : translate}px)`,
            left: inset,
            transition:
              "opacity 0.45s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {labels[0]}
        </span>

        <span
          className={cn(
            "absolute z-0 text-background font-medium select-none pointer-events-none",
            fontClass
          )}
          style={{
            opacity: checked ? 1 : 0,
            transform: `translateX(${checked ? -translate : translate}px)`,
            right: inset,
            transition:
              "opacity 0.45s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {labels[1]}
        </span>


        {/* Knob container handles clipping cleanly */}
          <span
            className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
          >
            <span
              className="absolute z-10 rounded-full bg-background shadow-[0_2px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform"
              style={{
                top: `${padding}px`,
                left: `${padding}px`,
                height: `${knobSize}px`,
                width: `${knobSize}px`,
                transform: checked
                    ? `translateX(${knobTravel}px)`
                    : "translateX(0)",
                transition: "transform 0.8s cubic-bezier(0.22,1,0.36,1)"
              }}
            />
          </span>
      </button>
    );
  }
);

Switch.displayName = "Switch";
