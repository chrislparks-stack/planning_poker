import { FC, useMemo } from "react";
import { Bar, BarChart, LabelList, Rectangle, XAxis } from "recharts";

import { CardFooter, CardTitle } from "@/components/ui/card";
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
        className="w-[14vw]"
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
            fill="hsl(var(--chart-1))"
            radius={5}
            fillOpacity={0.6}
            activeBar={<Rectangle fillOpacity={0.8} />}
          >
            <LabelList
              dataKey="Votes"
              content={({ x, y, value, width }) => {
                if (x == null || y == null || width == null) return null;

                const labelY = y - 10;
                const finalY = labelY < 10 ? 10 : labelY;

                const isMajority = value === maxCardCount;

                return (
                  <text
                    x={x + width / 2}
                    y={finalY + 50}
                    fill="white"
                    textAnchor="middle"
                    fontSize={12}
                    className="tabular-nums"
                  >
                    <tspan
                      x={x + width / 2}
                      fontWeight={isMajority ? "bold" : "normal"}
                    >
                      Votes: {value}
                    </tspan>
                    {isMajority && (
                      <tspan
                        x={x + width / 2}
                        dy="1.2em"
                        fontSize={10}
                        fill="#a78bfa" // optional accent color (lavender hue)
                      >
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

      {/* Heat bar for agreement */}
      <div className="w-full px-4 mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Agreement</span>
          <span className="tabular-nums">
            {agreement.toFixed(0)}%
            {agreement === 100
              ? " 🎉"
              : agreement >= 80
              ? " 👍"
              : agreement >= 50
              ? " 😐"
              : " 👎"}
          </span>
        </div>

        {/* Static gradient always spans full width */}
        <div className="relative w-full h-5 rounded-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, #EF4444, #FACC15, #22C55E)"
            }}
          />

          {/* This overlay masks the right side beyond agreement */}
          <div
            className="absolute right-0 top-0 h-full bg-zinc-700 transition-all duration-500"
            style={{
              width: `${100 - agreement}%`
            }}
          />
        </div>
      </div>

      <CardFooter className="flex flex-row items-center justify-center pb-0">
        <CardTitle className="text-2xl tabular-nums mr-4">
          {averageVote.toFixed(1)}{" "}
          <span className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
            average
          </span>
        </CardTitle>
      </CardFooter>
    </div>
  );
};
