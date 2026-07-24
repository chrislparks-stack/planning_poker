import { EyeOff } from "lucide-react";

interface CensoredVoteProps {
  value: string;
}

export function CensoredVote({ value }: CensoredVoteProps) {
  return (
    <div
      role="img"
      aria-label="Vote censored"
      data-testid="censored-vote"
      className="relative flex min-h-9 min-w-10 items-center justify-center"
    >
      <span aria-hidden="true" className="select-none opacity-70 blur-[7px]">
        {value}
      </span>
      <EyeOff
        aria-hidden="true"
        strokeWidth={1.7}
        className="absolute size-[18px] text-accent/90 drop-shadow-[0_0_5px_hsl(var(--accent)/0.45)]"
      />
    </div>
  );
}
