export interface VoteMetricSource {
  card?: string | null;
  value?: number | null;
}

export interface VoteMetrics {
  agreement: number;
  average: number;
  majorityCard: string | null;
  voteCount: number;
}

const normalizeCard = (card: string) =>
  card === "½" || card === "Â½" || card === "1/2" ? "0.5" : card;

export function getVoteMetrics(votes: VoteMetricSource[]): VoteMetrics {
  const counts = new Map<string, number>();
  let numericTotal = 0;
  let numericVotes = 0;

  votes.forEach((vote) => {
    if (!vote.card) return;

    const card = normalizeCard(vote.card);
    counts.set(card, (counts.get(card) ?? 0) + 1);

    const numericValue =
      typeof vote.value === "number" ? vote.value : Number(card);
    if (Number.isFinite(numericValue)) {
      numericTotal += numericValue;
      numericVotes += 1;
    }
  });

  const voteCount = Array.from(counts.values()).reduce(
    (total, count) => total + count,
    0
  );
  const sortedEntries = Array.from(counts.entries()).sort(
    ([cardA, countA], [cardB, countB]) =>
      countB - countA ||
      cardA.localeCompare(cardB, undefined, { numeric: true })
  );
  const majorityCount = sortedEntries[0]?.[1] ?? 0;
  const majorityCards = sortedEntries
    .filter(([, count]) => count === majorityCount)
    .map(([card]) => card);

  return {
    agreement:
      voteCount && majorityCount ? (majorityCount / voteCount) * 100 : 0,
    average: numericVotes ? numericTotal / numericVotes : 0,
    majorityCard: majorityCards.length ? majorityCards.join(" | ") : null,
    voteCount
  };
}
