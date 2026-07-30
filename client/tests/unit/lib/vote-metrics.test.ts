import { describe, expect, test } from "vitest";

import { getVoteMetrics } from "@/lib/vote-metrics";

describe("getVoteMetrics", () => {
  test("returns every winning card when a vote genuinely ends in a tie", () => {
    expect(
      getVoteMetrics([
        { card: "2", value: 2 },
        { card: "3", value: 3 },
        { card: "2", value: 2 },
        { card: "3", value: 3 }
      ])
    ).toMatchObject({
      agreement: 50,
      average: 2.5,
      majorityCard: "2 | 3",
      voteCount: 4
    });
  });
});
