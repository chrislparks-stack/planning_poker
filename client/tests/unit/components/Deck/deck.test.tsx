import { beforeEach, describe, expect, test, vi } from "vitest";

import { Deck } from "@/components/Deck";
import { render, screen, userEvent } from "@test";

const apiMocks = vi.hoisted(() => ({
  pickCard: vi.fn().mockResolvedValue({
    data: {
      pickCard: {
        users: [{ id: "user-1", lastCardPicked: "3" }]
      }
    }
  })
}));

vi.mock("@/api", () => ({
  usePickCardMutation: () => [apiMocks.pickCard]
}));

vi.mock("@/contexts", () => ({
  useAuth: () => ({ user: { id: "user-1", username: "Chris" } })
}));

vi.mock("@/hooks", () => ({
  useKeyboardControls: () => ({ cardsContainerRef: { current: null } })
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

const users = [
  {
    id: "user-1",
    username: "Chris",
    handRaised: false,
    lastCardPicked: null,
    lastCardValue: null,
    previousCardPicked: null,
    previousCardValue: null,
    voteUncensored: false
  }
];

const previousRound = {
  id: "round-1",
  roundNumber: 1,
  completedAt: "2026-07-23T12:00:00Z",
  votes: [
    {
      userId: "user-1",
      username: "Chris",
      card: "5",
      value: 5
    }
  ]
};

describe("Deck revote state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ghosts the current player's previous vote during a revote", () => {
    render(
      <Deck
        roomId="room-1"
        isGameOver={false}
        lockVotes
        cards={["3", "5", "8"]}
        users={users}
        previousRound={previousRound}
      />
    );

    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "5, previous vote" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("prevents card changes after a locked round is revealed", async () => {
    const user = userEvent.setup();
    render(
      <Deck
        roomId="room-1"
        isGameOver
        lockVotes
        cards={["3", "5", "8"]}
        users={users}
      />
    );

    const card = screen.getByRole("button", { name: "3" });
    expect(card).toBeDisabled();
    await user.click(card);
    expect(apiMocks.pickCard).not.toHaveBeenCalled();
  });
});
