import { UsersRound } from "lucide-react";
import {
  CSSProperties,
  FC,
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef
} from "react";
import { Bar, BarChart } from "recharts";

import { CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { VoteLabel, type VoteDatum } from "@/components/ui/vote-label.tsx";
import { cn } from "@/lib/utils";
import { Room } from "@/types";

interface VoteDistributionChartProps {
  room: Room;
}

interface DistributionBarsProps {
  chartData: VoteDatum[];
  maxCardCount: number;
  previousVoteCount: Record<string, number>;
  hasPreviousRound: boolean;
}

interface BarBounds {
  bottom: number;
  height: number;
}

interface LocalDistributionStyleFixture {
  current: Record<string, number>;
  previous: Record<string, number>;
}

const getLocalDistributionStyleFixture =
  (): LocalDistributionStyleFixture | null => {
    // Change only this value to true while tuning the current/last-round chart.
    const enabled = false;
    if (!enabled) return null;

    return {
      current: { "0.5": 1, "2": 20, "5": 2, "8": 1 },
      previous: { "0.5": 3, "2": 1, "3": 3, "5": 1 }
    };
  };

const normalizeCardLabel = (card: string) =>
  card === "½" || card === "1/2" ? "0.5" : card;

const numericCardValue = (card: string) => {
  const value = Number(normalizeCardLabel(card));
  return Number.isFinite(value) ? value : null;
};

const DistributionBars = memo(function DistributionBars({
  chartData,
  maxCardCount,
  previousVoteCount,
  hasPreviousRound
}: DistributionBarsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const previousVotesRef = useRef<Map<string, number>>(new Map());
  const previousBoundsRef = useRef<Map<string, BarBounds>>(new Map());
  const uniqueMajority =
    chartData.filter((datum) => datum.votes === maxCardCount).length === 1;
  const comparisonMaxCardCount = Math.max(
    maxCardCount,
    ...Object.values(previousVoteCount),
    1
  );
  const visualData = useMemo(
    () =>
      chartData.map((datum) => ({
        ...datum,
        previousVotes: previousVoteCount[datum.card] ?? 0,
        delta: datum.votes - (previousVoteCount[datum.card] ?? 0),
        comparisonMaxVotes: comparisonMaxCardCount,
        hasPreviousRound,
        visualHeight:
          0.56 +
          (Math.max(datum.votes, previousVoteCount[datum.card] ?? 0) /
            comparisonMaxCardCount) *
            0.44
      })),
    [chartData, comparisonMaxCardCount, hasPreviousRound, previousVoteCount]
  );

  useLayoutEffect(() => {
    const nextVotes = new Map(
      chartData.map((datum) => [datum.card, datum.votes] as const)
    );
    let attempts = 0;
    let animationFrame = 0;

    const animateChangedBars = () => {
      const bars = Array.from(
        chartRef.current?.querySelectorAll<SVGGElement>("[data-vote-card]") ??
          []
      );

      if (!bars.length && attempts < 4) {
        attempts += 1;
        animationFrame = requestAnimationFrame(animateChangedBars);
        return;
      }

      const nextBounds = new Map<string, BarBounds>();
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      bars.forEach((bar) => {
        const card = bar.getAttribute("data-vote-card");
        if (!card) return;

        const rect = bar.getBBox();
        const bounds = {
          bottom: rect.y + rect.height,
          height: rect.height
        };
        nextBounds.set(card, bounds);

        const previousCount = previousVotesRef.current.get(card);
        const previousBounds = previousBoundsRef.current.get(card);

        if (reduceMotion) return;

        if (previousCount == null) {
          bar.getAnimations().forEach((animation) => animation.cancel());
          bar.animate(
            [
              {
                opacity: 0.25,
                transform: "translateY(10px) scaleY(0.05)"
              },
              { opacity: 1, transform: "translateY(0) scaleY(1)" }
            ],
            { duration: 450, easing: "ease-out" }
          );
          return;
        }

        if (!previousBounds || bounds.height === 0) return;

        const scaleY = previousBounds.height / bounds.height;
        const translateY = previousBounds.bottom - bounds.bottom;
        if (Math.abs(scaleY - 1) < 0.001 && Math.abs(translateY) < 0.5) {
          return;
        }

        bar.getAnimations().forEach((animation) => animation.cancel());
        bar.animate(
          [
            {
              opacity: 1,
              transform: `translateY(${translateY}px) scaleY(${scaleY})`
            },
            { opacity: 1, transform: "translateY(0) scaleY(1)" }
          ],
          { duration: 450, easing: "ease-out" }
        );
      });

      previousVotesRef.current = nextVotes;
      previousBoundsRef.current = nextBounds;
    };

    animateChangedBars();
    return () => cancelAnimationFrame(animationFrame);
  }, [chartData]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || typeof ResizeObserver === "undefined") return;

    let animationFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const bounds = new Map<string, BarBounds>();
        chart
          .querySelectorAll<SVGGElement>("[data-vote-card]")
          .forEach((bar) => {
            const card = bar.getAttribute("data-vote-card");
            if (!card) return;
            const rect = bar.getBBox();
            bounds.set(card, {
              bottom: rect.y + rect.height,
              height: rect.height
            });
          });
        previousBoundsRef.current = bounds;
      });
    });

    observer.observe(chart);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <ChartContainer
      ref={chartRef}
      className="vote-bars h-[clamp(10rem,20vh,13.5rem)] w-full"
      config={{
        card: {
          label: "Votes",
          color: "hsl(var(--chart-1))"
        }
      }}
    >
      <BarChart
        data={visualData}
        margin={{ top: 28, right: 4, bottom: 2, left: 4 }}
        barCategoryGap="10%"
      >
        <Bar
          dataKey="visualHeight"
          maxBarSize={82}
          isAnimationActive={false}
          shape={
            <VoteLabel max={maxCardCount} uniqueMajority={uniqueMajority} />
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
                <div className="grid min-w-[8.5rem] grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {item.payload.votes}
                  </span>
                  {roomHasPreviousVotes(item.payload) && (
                    <>
                      <span className="text-muted-foreground">Last round</span>
                      <span className="font-mono tabular-nums text-foreground/75">
                        {item.payload.previousVotes}
                      </span>
                      <span className="text-muted-foreground">Change</span>
                      <span
                        className={cn(
                          "font-mono font-semibold tabular-nums",
                          item.payload.delta > 0 && "text-emerald-500",
                          item.payload.delta < 0 && "text-rose-500"
                        )}
                      >
                        {formatDelta(item.payload.delta)}
                      </span>
                    </>
                  )}
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
  const localStyleFixture = useMemo(
    () => getLocalDistributionStyleFixture(),
    []
  );

  const voteCount = useMemo(() => {
    if (localStyleFixture) {
      return { ...localStyleFixture.current };
    }

    const counts: { [key: string]: number } = {};
    room.game.table.forEach((userCard) => {
      if (userCard.card) {
        const card = normalizeCardLabel(userCard.card);
        counts[card] = (counts[card] || 0) + 1;
      }
    });

    return counts;
  }, [localStyleFixture, room.game.table]);

  const previousVoteCount = useMemo(() => {
    if (localStyleFixture) {
      return { ...localStyleFixture.previous };
    }

    const counts: Record<string, number> = {};
    room.previousRound?.votes.forEach((vote) => {
      if (!vote.card) return;
      const card = normalizeCardLabel(vote.card);
      counts[card] = (counts[card] ?? 0) + 1;
    });
    return counts;
  }, [localStyleFixture, room.previousRound]);

  const hasPreviousDistribution =
    room.previousRound != null || localStyleFixture != null;

  const chartData = useMemo<VoteDatum[]>(() => {
    return Array.from(
      new Set([...Object.keys(voteCount), ...Object.keys(previousVoteCount)])
    )
      .sort(compareCardLabels)
      .map((card) => ({
        card,
        votes: voteCount[card] ?? 0
      }));
  }, [previousVoteCount, voteCount]);

  const maxCardCount = useMemo(
    () => (chartData.length ? Math.max(...chartData.map((c) => c.votes)) : 0),
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
    const thirdPlace = numericByCount[2];
    const closeTieThreshold = Math.max(1, Math.floor(totalVotes * 0.1));
    const closeTie =
      runnerUp &&
      (!thirdPlace || runnerUp.count > thirdPlace.count) &&
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
      return `The team centers on ${leading[0]} - this story may be oversized, so consider splitting before committing.`;
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
      <DistributionBars
        chartData={chartData}
        maxCardCount={maxCardCount}
        previousVoteCount={previousVoteCount}
        hasPreviousRound={hasPreviousDistribution}
      />

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
        <AverageMetric value={averageVote.toFixed(1)} />

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

const AverageMetric: FC<{
  value: string;
}> = ({ value }) => (
  <div className="vote-distribution-divider flex min-w-0 flex-col items-center justify-center border-r px-1 text-center">
    <span className="vote-distribution-label text-[0.48rem] font-semibold tracking-[0.12em]">
      AVERAGE
    </span>
    <CardTitle className="vote-distribution-value mt-1 text-[1.5rem] tabular-nums leading-none">
      {value}
    </CardTitle>
  </div>
);

const compareCardLabels = (a: string, b: string) => {
  const aValue = numericCardValue(a);
  const bValue = numericCardValue(b);
  if (aValue != null && bValue != null) return aValue - bValue;
  if (aValue != null) return -1;
  if (bValue != null) return 1;
  return a.localeCompare(b);
};

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

const roomHasPreviousVotes = (payload: {
  previousVotes?: number;
  delta?: number;
}) => payload.previousVotes != null && payload.delta != null;
