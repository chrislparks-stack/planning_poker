import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labels?: [string, string];
}

/**
 * Chunky tactile switch — instant logic, smooth label fade.
 */
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      className,
      disabled,
      labels = ["Disabled", "Enabled"],
      ...props
    },
    ref
  ) => {
    const trackWidth = 140;
    const trackHeight = 56;
    const knobSize = 44;
    const padding = (trackHeight - knobSize) / 2;
    const knobTravel = trackWidth - knobSize - padding * 2;

    const [visibleLabel, setVisibleLabel] = React.useState(
      checked ? labels[1] : labels[0]
    );
    const [opacity, setOpacity] = React.useState(1);

    // when checked changes, fade out then update text
    React.useEffect(() => {
      setOpacity(0);
      const fadeTimer = setTimeout(() => {
        setVisibleLabel(checked ? labels[1] : labels[0]);
        setOpacity(1);
      }, 50);
      return () => clearTimeout(fadeTimer);
    }, [checked, labels]);

    const handleClick = () => {
      if (!disabled) {
        onCheckedChange(!checked); // update immediately
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
          "relative inline-flex select-none items-center justify-center rounded-full border font-semibold text-sm overflow-hidden",
          "transition-colors duration-500 ease-&lsqb;cubic-bezier(0.22,1,0.36,1)&rsqb;",
          checked
            ? "bg-accent border-accent text-accent-foreground"
            : "bg-zinc-400/70 dark:bg-zinc-700 border-transparent text-zinc-100",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        style={{
          width: `${trackWidth}px`,
          height: `${trackHeight}px`
        }}
      >
        {/* label that smoothly fades and slides position */}
        <span
          className={cn(
            "absolute text-background text-sm font-medium transition-all duration-500 ease-in-out select-none"
          )}
          style={{
            opacity,
            transform: `translateX(${checked ? "-18px" : "18px"})`,
            transition:
              "opacity 0.45s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)",
            left: checked ? "20%" : "auto",
            right: checked ? "auto" : "20%"
          }}
        >
          {visibleLabel}
        </span>

        {/* smooth chunky knob */}
        <span
          className="absolute rounded-full bg-background shadow-lg transition-transform"
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
      </button>
    );
  }
);

Switch.displayName = "Switch";
