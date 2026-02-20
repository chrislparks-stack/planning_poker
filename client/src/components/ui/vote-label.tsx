import {FC} from "react";
import {clamp} from "@/utils/messageUtils.ts";

interface VoteLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  max: number;
  barCount: number;
}

export const VoteLabel: FC<VoteLabelProps> = ({
  x,
  y,
  width,
  height,
  value,
  max,
  barCount,
}) => {
  const isMajority = value === max;

  const cx = x && width ? x + width / 2 : 65;
  const centerY = y && height ? y + height / 2 : 75;

  const minPadding = 12;
  const safeY = y ? Math.max(centerY - 8, y + minPadding) : 65;

  const labelWidthValue = 0.7 / (barCount / 2);
  const majorityWidthValue = 0.55 / (barCount / 2);

  return (
    <text
      x={cx}
      y={safeY}
      fill="white"
      textAnchor="middle"
      dominantBaseline="middle"
      className="tabular-nums"
      fontSize={clamp(5, `${labelWidthValue}vw`, 18)}
      pointerEvents="none"
    >
      <tspan
        x={cx}
        dy={isMajority ? "0.2em" : "0em"}
        fontWeight={isMajority ? "bold" : "normal"}
      >
        Votes: {value}
      </tspan>

      {isMajority && (
        <tspan
          x={cx}
          dy="1.4em"
          fontSize={clamp(3, `${majorityWidthValue}vw`, 15)}
        >
          MAJORITY
        </tspan>
      )}
    </text>
  );
};
