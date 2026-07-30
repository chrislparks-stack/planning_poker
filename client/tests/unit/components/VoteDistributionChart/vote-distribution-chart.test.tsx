import { beforeAll, describe, expect, test, vi } from "vitest";

import { VoteDistributionChart } from "@/components/vote-distribution-chart";
import type { Room } from "@/types";
import { render, screen } from "@test";

beforeAll(() => {
  class ResizeObserverMock implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe(target: Element) {
      const contentRect = {
        bottom: 260,
        height: 260,
        left: 0,
        right: 280,
        top: 0,
        width: 280,
        x: 0,
        y: 0,
        toJSON: () => ({})
      } as DOMRectReadOnly;

      this.callback(
        [
          {
            borderBoxSize: [],
            contentBoxSize: [],
            contentRect,
            devicePixelContentBoxSize: [],
            target
          }
        ],
        this
      );
    }

    disconnect() {}

    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  });
});

const room: Room = {
  id: "room-1",
  name: "Revote comparison",
  bannedUsers: [],
  censorVotes: false,
  chatHistory: [],
  confirmNewGame: true,
  countdownEnabled: false,
  countdownValue: null,
  deck: {
    id: "deck-1",
    cards: ["3", "5", "8"]
  },
  game: {
    id: "game-1",
    table: [
      { userId: "user-1", card: "5" },
      { userId: "user-2", card: "5" }
    ]
  },
  isGameOver: true,
  lockVotes: true,
  previousRound: {
    id: "round-1",
    roundNumber: 1,
    revoteCount: 0,
    completedAt: "2026-07-23T12:00:00Z",
    issueTitle: null,
    votes: [
      {
        userId: "user-1",
        username: "One",
        card: "3",
        value: 3,
        selections: [{ card: "3", value: 3, phase: 0 }]
      },
      {
        userId: "user-2",
        username: "Two",
        card: "8",
        value: 8,
        selections: [{ card: "8", value: 8, phase: 0 }]
      }
    ]
  },
  revealStage: "revealed",
  roomOwnerId: "user-1",
  showVoteChanges: true,
  voteHistory: [],
  voteQueue: [],
  users: []
};

describe("VoteDistributionChart revote comparison", () => {
  test("keeps the comparison inside the chart instead of adding a separate panel", () => {
    render(<VoteDistributionChart room={room} />);

    expect(screen.queryByText("Revote comparison")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Revote comparison" })
    ).not.toBeInTheDocument();
  });
});
