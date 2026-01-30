import {FC} from "react";

interface ThumbSwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}


export const ThumbSwitch: FC<ThumbSwitchProps> = ({
   checked,
   onCheckedChange,
   disabled,
   label
 })=> {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-accent" : "bg-gray-600"
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-background shadow",
          "transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        ].join(" ")}
      />
    </button>
  );
}
