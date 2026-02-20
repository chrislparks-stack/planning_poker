import {FC, useEffect, useMemo, useRef, useState} from "react";
import {Bar, BarChart, Cell, XAxis} from "recharts";

import { CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Room } from "@/types";
import {useBackgroundConfig} from "@/contexts/BackgroundContext.tsx";
import {VoteLabel} from "@/components/ui/vote-label.tsx";

interface VoteDistributionChartProps {
  room: Room;
}

export const VoteDistributionChart: FC<VoteDistributionChartProps> = ({
  room
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [showLabels, setShowLabels] = useState(false);

  const { background } = useBackgroundConfig();
  const isStarry = background.enabled && background.id === "starry";

  const voteCount = useMemo(() => {
    const voteCount: { [key: string]: number } = {};
    room.game.table.forEach((userCard) => {
      if (userCard.card) {
        voteCount[userCard.card] = (voteCount[userCard.card] || 0) + 1;
      }
    });

    // const testVotes: Record<string, number> = {
    //   2: 20,
    //   3: 1,
    // };
    //
    // Object.assign(voteCount, testVotes);

    return voteCount;
  }, [room.game.table]);

  const voteSignature = useMemo(() => {
    const counts: Record<string, number> = {};

    room.game.table.forEach((userCard) => {
      if (userCard.card) {
        counts[userCard.card] = (counts[userCard.card] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([card, n]) => `${card}:${n}`)
      .join("|");
  }, [room.game.table]);

  const chartData = useMemo(() => {
    if (!voteSignature) return [];

    return voteSignature.split("|").map((entry) => {
      const [card, count] = entry.split(":");
      return {
        card,
        cardValue: parseFloat(card),
        Votes: Number(count),
      };
    });
  }, [voteSignature]);

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

  useEffect(() => {
    if (!room.isGameOver) return;
    if (!chartRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const verify = () => {
      if (cancelled) return;
      if (!chartRef.current) return;

      const labels =
        chartRef.current.querySelectorAll("text");

      const expected = chartData.length;

      if (labels.length < expected && attempts < maxAttempts) {
        attempts++;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(verify, 120);
          });
        });
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        verify();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [chartData, room]);

  useEffect(() => {
    if (!room.isGameOver) return;
    setShowLabels(false);
    const t = setTimeout(() => setShowLabels(true), 750);
    return () => clearTimeout(t);
  }, [chartData]);

  return (
    <div
      className="flex flex-col items-center justify-center overflow-visible"
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
        ref={chartRef}
        style={chartContainerStyle}
        className="-mb-5 h-[15vh] min-h-[170px]"
        config={{
          card: {
            label: "Votes",
            color: "hsl(var(--chart-1))"
          }
        }}
      >
        <BarChart data={chartData}>
          <Bar
            dataKey="Votes"
            radius={10}
            minPointSize={24}
            fillOpacity={0.5}
            isAnimationActive
            animationBegin={0}
            animationDuration={500}
            label={showLabels && <VoteLabel max={maxCardCount} barCount={chartData.length} />}
          >
            {chartData.map((entry) => {
              const isMajority = entry.Votes === maxCardCount;
              return (
                <Cell
                  key={entry.card}
                  fill="hsl(var(--accent))"
                  style={{
                    filter: isMajority
                      ? "drop-shadow(0 0 10px hsl(var(--accent))) drop-shadow(0 0 24px rgba(var(--accent-rgb),0.4))"
                      : "drop-shadow(0 0 10px rgba(var(--accent-rgb),0.3))",
                    animation: isMajority ? "pulseGlow 3s ease-in-out infinite" : undefined,
                  }}
                />
              );
            })}
          </Bar>
          <XAxis
            dataKey="card"
            tickLine={false}
            axisLine={false}
            tickMargin={4}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `Story Points | ${value}`}
              />
            }
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
          <CardTitle
            className={[
              "text-[clamp(1rem,3vw,2rem)] tabular-nums",
              isStarry
                ? "text-accent-foreground"
                : "text-foreground dark:text-accent-foreground",
              "drop-shadow-[0_0_6px_rgba(var(--accent-rgb),0.4)]"
            ].join(" ")}
          >
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
