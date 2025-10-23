import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    labels?: [string, string];
}

/**
 * Chunky tactile switch — vivid in light, dimensional in dark.
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
        // ✅ reduce travel slightly so knob stays inside border
        const knobTravel = trackWidth - knobSize - padding * 2 - 2;

        const [visibleLabel, setVisibleLabel] = React.useState(
            checked ? labels[1] : labels[0]
        );
        const [opacity, setOpacity] = React.useState(1);

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
                    "transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
                {/* Fading label */}
                <span
                    className="absolute z-0 text-background text-sm font-medium transition-all duration-500 ease-in-out select-none pointer-events-none"
                    style={{
                        opacity,
                        transform: `translateX(${checked ? "-14px" : "14px"})`,
                        transition:
                            "opacity 0.45s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)",
                        left: checked ? "22%" : "auto",
                        right: checked ? "auto" : "22%",
                    }}
                >
          {visibleLabel}
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
                  transition: "transform 0.8s cubic-bezier(0.22,1,0.36,1)",
              }}
          />
        </span>
            </button>
        );
    }
);

Switch.displayName = "Switch";
