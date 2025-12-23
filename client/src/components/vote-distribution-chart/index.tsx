import {FC, useEffect, useMemo, useState} from "react";
import {Bar, BarChart, Cell, LabelList, XAxis} from "recharts";

import { CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Room } from "@/types";
import {clamp} from "@/utils/messageUtils.ts";

interface VoteDistributionChartProps {
  room: Room;
}

export const VoteDistributionChart: FC<VoteDistributionChartProps> = ({
  room
}) => {
  const voteCount = useMemo(() => {
    const voteCount: { [key: string]: number } = {};
    room.game.table.forEach((userCard) => {
      if (userCard.card) {
        voteCount[userCard.card] = (voteCount[userCard.card] || 0) + 1;
      }
    });

    // const testVotes: Record<string, number> = {
    //   2: 3,
    //   3: 1,
    //   5: 4,
    //   8: 1,
    // };
    //
    // Object.assign(voteCount, testVotes);

    return voteCount;
  }, [room.game.table]);

  const chartData = useMemo(() => {
    return Object.entries(voteCount).map(([card, Votes]) => ({
      card,
      Votes
    }));
  }, [voteCount]);

  const maxCardCount = useMemo(() => {
    return Math.max(...chartData.map((card) => card.Votes));
  }, [chartData]);

  const averageVote = useMemo(() => {
    const numericVotes = room.game.table
      .map((userCard) => parseFloat(userCard.card || "0"))
      .filter((vote) => !isNaN(vote));
    const sum = numericVotes.reduce((acc, vote) => acc + vote, 0);
    return numericVotes.length > 0 ? sum / numericVotes.length : 0;
  }, [room.game.table]);

  const agreement = useMemo(() => {
    const totalVotes = room.game.table.length;
    const mostCommonVotes = Math.max(...Object.values(voteCount));
    return totalVotes > 0 ? (mostCommonVotes / totalVotes) * 100 : 0;
  }, [room.game.table, voteCount]);

  const numBars = chartData.length;
  const dynamicWidth = 8 + numBars * 1.5;
  const dynamicMinWidth = 10 + numBars * 2;
  const dynamicMaxWidth = 120 + numBars * 70;

  const chartContainerStyle = {
    minWidth: `${dynamicMinWidth}px`,
    width: `${dynamicWidth}vw`,
    maxWidth: `${dynamicMaxWidth}px`,
    minHeight: "170px"
  };

  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if(room.isGameOver && !showLabels) {
      setShowLabels(true);
    }
  }, [room, showLabels, chartData]);

  return (
    <div
      className="flex flex-col items-center justify-center overflow-hidden"
      data-testid="vote-distribution-chart"
    >
      {chartData.length === 0 && (
        <div className="absolute flex items-center justify-center w-[4vw] bg-background/70 z-10">
          <span className="text-[clamp(0.5rem,1.5vw,2rem)] font-semibold text-muted-foreground select-none text-center">
            NO VOTES SUBMITTED
          </span>
        </div>
      )}

      <ChartContainer
        style={chartContainerStyle}
        className="-mb-5 h-[15vh]"
        config={{
          card: {
            label: "Votes",
            color: "hsl(var(--chart-1))"
          }
        }}
      >
        <BarChart
          accessibilityLayer
          margin={{top: 10}}
          data={chartData}
        >
          <Bar
            dataKey="Votes"
            radius={10}
            fillOpacity={0.9}
            isAnimationActive
            animationDuration={500}
            onAnimationStart={() => setShowLabels(false)}
            onAnimationEnd={() => setShowLabels(true)}
          >
            {chartData.map((entry, index) => {
              const isMajority = entry.Votes === maxCardCount;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill="hsl(var(--accent))"
                  style={{
                    filter: isMajority
                      ? "drop-shadow(0 0 10px hsl(var(--accent))) drop-shadow(0 0 24px rgba(var(--accent-rgb),0.4))"
                      : "drop-shadow(0 0 10px rgba(var(--accent-rgb),0.3))",
                    animation: isMajority ? "pulseGlow 3s ease-in-out infinite" : undefined,
                    transformOrigin: "center"
                  }}
                />
              );
            })}
            <LabelList
              dataKey="Votes"
              position="center"
              content={(props: any) => {
                const { x, y, width, height, value, index } = props;

                if (x == null || y == null || index == null) return null;

                const entry = chartData[index];
                if (!entry) return null;

                const isMajority = entry.Votes === maxCardCount;
                const safeWidth = Math.max(width ?? 0, 1);
                const safeHeight = Math.max(height ?? 0, 1);
                const centerX = x + safeWidth / 2;
                const centerY = y + safeHeight / 2;
                const numBars = chartData.length;
                const labelWidthValue= 0.9 / (numBars / 2);
                const majorityWidthValue = 0.75 / (numBars / 2);
                const labelFontSize = clamp(5, `${labelWidthValue}vw`, 18);
                const majorityFontSize =  clamp(4, `${majorityWidthValue}vw`, 15);

                return (
                  <text
                    x={centerX}
                    y={centerY}
                    fill="white"
                    textAnchor="middle"
                    fontSize={labelFontSize}
                    dominantBaseline="middle"
                    className="tabular-nums"
                  >
                    <tspan x={centerX} fontWeight={isMajority ? "bold" : "normal"}>
                      Votes: {value}
                    </tspan>

                    {isMajority && (
                      <tspan x={centerX} dy="1.6em" fontSize={majorityFontSize}>
                        MAJORITY
                      </tspan>
                    )}
                  </text>
                );
              }}
            />
          </Bar>
          <XAxis
            dataKey="card"
            tickLine={false}
            axisLine={false}
            tickMargin={4}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `Points: ${value}`}
              />
            }
            cursor={false}
          />
        </BarChart>
      </ChartContainer>

      {/* --- Gauge --- */}
      <div className="relative w-[clamp(1.25rem,10vw,10rem)] h-[clamp(60px,10vw,100px)] flex items-end justify-center">
        <svg viewBox="0 0 100 50" className="absolute top-0 left-0 w-full h-full">
          <path
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.25"
          />
          <path
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="126"
            strokeDashoffset={126 - (agreement / 100) * 126}
            style={{
              filter: "drop-shadow(0 0 2px rgba(var(--accent-rgb),0.6))",
              transition: "stroke-dashoffset 0.6s ease",
            }}
          />
        </svg>

        <div className="absolute bottom-0 flex flex-col items-center justify-center text-center">
          <CardTitle className="text-[clamp(1rem,3vw,2rem)] tabular-nums text-foreground dark:text-accent-foreground drop-shadow-[0_0_6px_rgba(var(--accent-rgb),0.4)]">
            {averageVote.toFixed(1)}
          </CardTitle>
          <span className="text-[clamp(0.45rem,1.2vw,0.75rem)] text-muted-foreground tracking-tight text-nowrap">
            avg • {agreement.toFixed(0)}% agree
          </span>
        </div>
      </div>
    </div>
  );
};
