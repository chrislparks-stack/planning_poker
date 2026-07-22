import { UsersRound } from "lucide-react";
import { CSSProperties, FC, memo, useMemo } from "react";
import { Bar, BarChart } from "recharts";

import { CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { VoteLabel } from "@/components/ui/vote-label.tsx";
import { Room } from "@/types";

interface VoteDistributionChartProps {
  room: Room;
}

interface ChartDatum {
  card: string;
  cardValue: number;
  Votes: number;
  VisualHeight?: number;
}

interface DistributionBarsProps {
  chartData: ChartDatum[];
  maxCardCount: number;
}

const normalizeCardLabel = (card: string) =>
  card === "½" || card === "1/2" ? "0.5" : card;

const numericCardValue = (card: string) => {
  const value = Number(normalizeCardLabel(card));
  return Number.isFinite(value) ? value : null;
};

/**
 * The chart, isolated behind `memo`. RoomPage hands the component a fresh `room`
 * object on every subscription snapshot; without this boundary those re-renders
 * would restart the CSS grow/label-reveal animations (a visible flicker) on each
 * snapshot. Memoizing on the (stable) chartData/maxCardCount keeps the subtree
 * from re-rendering unless the vote distribution actually changes.
 */
const DistributionBars = memo(function DistributionBars({
  chartData,
  maxCardCount
}: DistributionBarsProps) {
  const uniqueMajority =
    chartData.filter((d) => d.Votes === maxCardCount).length === 1;
  const visualData = useMemo(
    () =>
      chartData.map((datum) => ({
        ...datum,
        VisualHeight:
          0.56 + (maxCardCount ? (datum.Votes / maxCardCount) * 0.44 : 0)
      })),
    [chartData, maxCardCount]
  );
  return (
    <ChartContainer
      className="vote-bars-enter h-[clamp(10rem,20vh,13.5rem)] w-full"
      config={{
        card: {
          label: "Votes",
          color: "hsl(var(--chart-1))"
        }
      }}
    >
      <BarChart
        data={visualData}
        margin={{ top: 18, right: 4, bottom: 2, left: 4 }}
        barCategoryGap="10%"
      >
        <Bar
          dataKey="VisualHeight"
          maxBarSize={82}
          isAnimationActive={false}
          shape={
            <VoteLabel
              data={chartData}
              max={maxCardCount}
              uniqueMajority={uniqueMajority}
            />
          }
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_value, payload) =>
                `Story Points | ${payload[0]?.payload.card ?? ""}`
              }
              formatter={(_value, _name, item) => (
                <div className="flex min-w-[7rem] items-center justify-between gap-4">
                  <span className="text-muted-foreground">Votes</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {item.payload.Votes}
                  </span>
                </div>
              )}
            />
          }
        />
      </BarChart>
    </ChartContainer>
  );
});

export const VoteDistributionChart: FC<VoteDistributionChartProps> = ({
  room
}) => {
  const voteCount = useMemo(() => {
    const counts: { [key: string]: number } = {};
    room.game.table.forEach((userCard) => {
      if (userCard.card) {
        const card = normalizeCardLabel(userCard.card);
        counts[card] = (counts[card] || 0) + 1;
      }
    });

    // Local styling fixture. Uncomment while tuning the distribution chart.
    // Object.assign(counts, { "0": 1, "0.5": 1, "2": 10, "3": 3 });

    return counts;
  }, [room.game.table]);

  const voteSignature = useMemo(
    () =>
      Object.entries(voteCount)
        .sort(([a], [b]) => {
          const aValue = numericCardValue(a);
          const bValue = numericCardValue(b);
          if (aValue != null && bValue != null) return aValue - bValue;
          if (aValue != null) return -1;
          if (bValue != null) return 1;
          return a.localeCompare(b);
        })
        .map(([card, n]) => `${card}:${n}`)
        .join("|"),
    [voteCount]
  );

  const chartData = useMemo<ChartDatum[]>(() => {
    if (!voteSignature) return [];

    return voteSignature.split("|").map((entry) => {
      const [card, count] = entry.split(":");
      return {
        card,
        cardValue: numericCardValue(card) ?? Number.POSITIVE_INFINITY,
        Votes: Number(count)
      };
    });
  }, [voteSignature]);

  const maxCardCount = useMemo(
    () => (chartData.length ? Math.max(...chartData.map((c) => c.Votes)) : 0),
    [chartData]
  );

  const averageVote = useMemo(() => {
    let sum = 0;
    let n = 0;
    Object.entries(voteCount).forEach(([card, c]) => {
      const v = numericCardValue(card);
      if (v != null) {
        sum += v * c;
        n += c;
      }
    });
    return n > 0 ? sum / n : 0;
  }, [voteCount]);

  const agreement = useMemo(() => {
    const counts = Object.values(voteCount);
    const totalVotes = counts.reduce((total, n) => total + n, 0);
    const mostCommonVotes = counts.length ? Math.max(...counts) : 0;
    return totalVotes > 0 ? (mostCommonVotes / totalVotes) * 100 : 0;
  }, [voteCount]);

  const consensusInsight = useMemo(() => {
    const entries = Object.entries(voteCount);
    const totalVotes = entries.reduce((total, [, count]) => total + count, 0);
    if (!totalVotes) return "Wait for the team to vote before discussing.";

    const numericEntries = entries
      .map(([card, count]) => ({
        card,
        count,
        value: numericCardValue(card)
      }))
      .filter(
        (entry): entry is { card: string; count: number; value: number } =>
          entry.value != null
      )
      .sort((a, b) => a.value - b.value);
    const nonNumericVotes =
      totalVotes -
      numericEntries.reduce((total, entry) => total + entry.count, 0);
    const leading = entries.reduce((leader, entry) =>
      entry[1] > leader[1] ? entry : leader
    );
    const numericByCount = [...numericEntries].sort(
      (a, b) => b.count - a.count || a.value - b.value
    );
    const leadingValue = numericCardValue(leading[0]);
    const runnerUp = numericByCount[1];
    const closeTieThreshold = Math.max(1, Math.floor(totalVotes * 0.1));
    const closeTie =
      runnerUp &&
      Math.abs(numericByCount[0].count - runnerUp.count) <= closeTieThreshold;
    const high = numericEntries[numericEntries.length - 1];
    const previousHigh = numericEntries[numericEntries.length - 2];
    const low = numericEntries[0];
    const nextLow = numericEntries[1];
    const highOutlier =
      numericEntries.length >= 3 &&
      high?.count === 1 &&
      previousHigh != null &&
      (high.value >= previousHigh.value * 2 ||
        high.value - previousHigh.value >= 5);
    const lowOutlier =
      numericEntries.length >= 3 &&
      low?.count === 1 &&
      nextLow != null &&
      nextLow.value >= Math.max(low.value * 2, low.value + 3);

    if (nonNumericVotes > 0) {
      return `${nonNumericVotes} non-numeric ${
        nonNumericVotes === 1 ? "vote needs" : "votes need"
      } clarification before sizing.`;
    }

    if (leadingValue != null && leadingValue >= 13) {
      return `The team centers on ${leading[0]} - this story maybe oversized, consider splitting before committing.`;
    }

    if (closeTie) {
      return `Close split between ${numericByCount[0].card} and ${runnerUp.card} - discuss any remaining assumptions.`;
    }

    if (highOutlier || lowOutlier) {
      const outlier = highOutlier ? high : low;
      return `Possible outlier at ${outlier.card} - ask about hidden scope or assumptions.`;
    }

    if (agreement >= 75) {
      return `Strong alignment on ${leading[0]} - confirm and commit.`;
    }

    if (agreement >= 50) {
      return `The team leans toward ${leading[0]} - confirm the key assumptions.`;
    }

    if (numericEntries.length > 1) {
      const low = numericEntries[0].card;
      const high = numericEntries[numericEntries.length - 1].card;
      return `Wide spread (${low}-${high}) - compare and discuss the lowest [${low}] and highest [${high}] assumptions.`;
    }

    return "No clear estimate yet - compare assumptions before committing.";
  }, [agreement, voteCount]);

  const compactWidth = Math.min(520, Math.max(280, chartData.length * 78 + 20));
  const chartStyle = {
    "--vote-chart-width": `${compactWidth}px`
  } as CSSProperties;

  return (
    <div
      className="vote-distribution-chart flex min-w-[220px] max-w-[520px] shrink flex-col items-center justify-center overflow-visible"
      style={chartStyle}
      data-expand-consensus={chartData.length >= 4}
      data-testid="vote-distribution-chart"
    >
      {chartData.length === 0 && (
        <div className="absolute flex items-center justify-center w-[4vw] bg-background/70 z-10">
          <span className="text-[clamp(0.5rem,1.5vw,2rem)] font-semibold text-muted-foreground select-none text-center">
            NO VOTES SUBMITTED
          </span>
        </div>
      )}
      <DistributionBars chartData={chartData} maxCardCount={maxCardCount} />

      <div className="vote-distribution-summary mt-2 grid min-h-[76px] w-full items-center overflow-hidden rounded-xl px-1.5 py-1.5 backdrop-blur-md">
        <div className="flex items-center justify-center">
          <span className="vote-distribution-community flex size-8 items-center justify-center rounded-full border">
            <UsersRound
              className="size-[58%]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
        </div>
        <Metric label="AVERAGE" value={averageVote.toFixed(1)} dividerAfter />

        <div className="vote-consensus flex min-w-0 items-center justify-center gap-2 px-1">
          <div className="relative h-[66px] w-[clamp(108px,46cqw,160px)] max-w-full shrink-0">
            <svg
              viewBox="0 0 180 94"
              className="absolute inset-0 size-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="consensus-gradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="var(--vote-fill-top)" />
                  <stop offset="100%" stopColor="var(--vote-neon)" />
                </linearGradient>
              </defs>
              <path
                d="M18,80 A72,72 0 0,1 162,80"
                fill="none"
                stroke="var(--vote-track)"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M18,80 A72,72 0 0,1 162,80"
                fill="none"
                stroke="url(#consensus-gradient)"
                strokeWidth="9"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - agreement}
                style={{
                  filter: "var(--vote-gauge-shadow)",
                  transition: "stroke-dashoffset 0.6s ease"
                }}
              />
            </svg>
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pt-5 text-center leading-none">
              <CardTitle className="vote-distribution-value text-[1.5rem] tabular-nums">
                {agreement.toFixed(0)}%
              </CardTitle>
              <span className="vote-distribution-label mt-0.5 text-[0.48rem] font-bold tracking-[0.14em]">
                AGREE
              </span>
              <span className="vote-consensus-pill mt-1 rounded-full border px-3 py-0.5 text-[0.4rem] font-semibold tracking-[0.12em]">
                CONSENSUS LEVEL
              </span>
            </div>
          </div>
          <p className="vote-consensus-copy min-w-0 text-[0.56rem] leading-4">
            <span className="vote-distribution-label mb-0.5 block text-[0.44rem] font-bold tracking-[0.14em]">
              NEXT STEP
            </span>
            {consensusInsight}
          </p>
        </div>
      </div>
    </div>
  );
};

const Metric: FC<{
  label: string;
  value: string;
  dividerAfter?: boolean;
}> = ({ label, value, dividerAfter = false }) => (
  <div
    className={[
      "flex min-w-0 flex-col items-center justify-center px-1 text-center",
      dividerAfter ? "vote-distribution-divider border-r" : ""
    ].join(" ")}
  >
    <span className="vote-distribution-label text-[0.48rem] font-semibold tracking-[0.12em]">
      {label}
    </span>
    <CardTitle className="vote-distribution-value mt-1 text-[1.5rem] tabular-nums leading-none">
      {value}
    </CardTitle>
  </div>
);
