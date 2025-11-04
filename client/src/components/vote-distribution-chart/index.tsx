import { FC, useMemo } from "react";
import {Bar, BarChart, Cell, LabelList, XAxis} from "recharts";

import { CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Room } from "@/types";

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

  return (
    <div
      className="flex flex-col items-center justify-center overflow-hidden w-[20vw]"
      data-testid="vote-distribution-chart"
    >
      <ChartContainer
        className="w-[14vw] h-[10vh] -mb-5"
        config={{
          card: {
            label: "Votes",
            color: "hsl(var(--chart-1))"
          }
        }}
      >
        <BarChart
          accessibilityLayer
          margin={{
            left: -4,
            right: -4
          }}
          data={chartData}
        >
          <Bar
            dataKey="Votes"
            radius={5}
            fillOpacity={0.9}
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
                    transformOrigin: "center",
                  }}
                />
              );
            })}
            <LabelList
              dataKey="Votes"
              content={({
                          x,
                          y,
                          value,
                          width,
                          height,
                        }: {
                x?: number | string;
                y?: number | string;
                value?: number | string;
                width?: number | string;
                height?: number | string;
              }) => {
                // tiny helper to coerce string|number|undefined -> number safely
                const toNum = (v?: number | string, fallback = 0) =>
                  typeof v === "number" ? v : v ? parseFloat(String(v)) || fallback : fallback;

                const nx = toNum(x);
                const ny = toNum(y);
                const nwidth = toNum(width);
                const nheight = toNum(height);
                const nvalue = toNum(value);

                if (Number.isNaN(nx) || Number.isNaN(ny) || Number.isNaN(nwidth) || Number.isNaN(nheight)) {
                  return null;
                }

                console.log(nwidth);

                const isMajority = nvalue === maxCardCount;
                const labelFontSize = nwidth < 80 ? nwidth / 5 : 16;

                let labelY = ny + nheight / 2;
                let fillColor = "white";

                const centerX = nx + nwidth / 2;

                return (
                  <text
                    x={centerX}
                    y={labelY}
                    fill={fillColor}
                    textAnchor="middle"
                    fontSize={labelFontSize}
                    className="tabular-nums"
                    dominantBaseline="middle"
                  >
                    <tspan x={centerX} fontWeight={isMajority ? "bold" : "normal"}>
                      Votes: {nvalue}
                    </tspan>

                    {isMajority && (
                      <tspan x={centerX} dy="1.6em" fontSize={ nwidth < 80 ? nwidth / 6 : 14} className="text-white font-bold">
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
      <div className="relative w-[160px] h-[110px] flex items-end justify-center">
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
          <CardTitle className="text-3xl tabular-nums text-foreground dark:text-accent-foreground drop-shadow-[0_0_6px_rgba(var(--accent-rgb),0.4)]">
            {averageVote.toFixed(1)}
          </CardTitle>
          <span className="text-[11px] text-muted-foreground tracking-tight">
            avg • {agreement.toFixed(0)}% agree
          </span>
        </div>
      </div>
    </div>
  );
};
