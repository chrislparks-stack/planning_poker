import { beforeEach, describe, expect, test, vi } from "vitest";

import { Deck } from "@/components/Deck";
import { fireEvent, render, screen, userEvent, waitFor } from "@test";

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
  revoteCount: 0,
  completedAt: "2026-07-23T12:00:00Z",
  issueTitle: null,
  votes: [
    {
      userId: "user-1",
      username: "Chris",
      card: "5",
      value: 5,
      selections: [{ card: "5", value: 5, phase: 0 }]
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

  test("wraps from the available room width instead of the browser width", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1400
    });
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        bottom: 0,
        height: 0,
        left: 0,
        right: 700,
        top: 0,
        width: 700,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

    const { container } = render(
      <Deck
        roomId="room-1"
        isGameOver={false}
        lockVotes={false}
        cards={["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "?", "☕"]}
        users={users}
      />
    );

    await waitFor(() =>
      expect(container.querySelector("[data-layout]")).toHaveAttribute(
        "data-layout",
        "two-row"
      )
    );

    rectSpy.mockRestore();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth
    });
  });

  test("keeps a revealed eleven-card deck on one row when it fits", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        bottom: 0,
        height: 0,
        left: 0,
        right: 1387,
        top: 0,
        width: 1387,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

    const { container } = render(
      <Deck
        roomId="room-1"
        isGameOver
        lockVotes={false}
        cards={["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "?", "â˜•"]}
        users={users}
      />
    );

    await waitFor(() =>
      expect(container.querySelector("[data-layout]")).toHaveAttribute(
        "data-layout",
        "single-row"
      )
    );

    expect(
      (container.querySelector("[data-layout]") as HTMLElement).style
        .paddingLeft
    ).toBe("");
    rectSpy.mockRestore();
  });

  test("grows and shrinks card spacing independently of the wrap width", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900
    });
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        bottom: 0,
        height: 0,
        left: 0,
        right: 1387,
        top: 0,
        width: 1387,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

    const { container } = render(
      <Deck
        roomId="room-1"
        isGameOver={false}
        lockVotes={false}
        cards={["0", "1", "2"]}
        users={users}
      />
    );
    const deck = container.querySelector("[data-layout]") as HTMLElement;

    await waitFor(() => expect(deck.style.gap).toBe("27px"));

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1400
    });
    fireEvent(window, new Event("resize"));

    await waitFor(() => expect(deck.style.gap).toBe("42px"));

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 2000
    });
    fireEvent(window, new Event("resize"));

    await waitFor(() => expect(deck.style.gap).toBe("44px"));

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth
    });
    rectSpy.mockRestore();
  });

  test("compresses a single-row deck before wrapping it", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1400
    });
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        bottom: 0,
        height: 0,
        left: 0,
        right: 1100,
        top: 0,
        width: 1100,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

    const { container } = render(
      <Deck
        roomId="room-1"
        isGameOver
        lockVotes={false}
        cards={["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "?", "☕"]}
        users={users}
      />
    );
    const deck = container.querySelector("[data-layout]") as HTMLElement;

    await waitFor(() => {
      expect(deck).toHaveAttribute("data-layout", "single-row");
      expect(deck).toHaveAttribute("data-gap-mode", "compressed");
      expect(deck.style.gap).toBe("19.2px");
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth
    });
    rectSpy.mockRestore();
  });

  test("grows and shrinks wrapped-row spacing with the visible workspace", async () => {
    const originalWidth = window.innerWidth;
    let measuredWidth = 700;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1400
    });
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(() => ({
        bottom: 0,
        height: 0,
        left: 0,
        right: measuredWidth,
        top: 0,
        width: measuredWidth,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }));

    const { container } = render(
      <Deck
        roomId="room-1"
        isGameOver
        lockVotes={false}
        cards={["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "?", "☕"]}
        users={users}
      />
    );
    const deck = container.querySelector("[data-layout]") as HTMLElement;

    await waitFor(() => {
      expect(deck).toHaveAttribute("data-layout", "two-row");
      expect(deck).toHaveAttribute("data-gap-mode", "wrapped-minimum");
      expect(deck.style.columnGap).toBe("12px");
    });

    measuredWidth = 900;
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(deck).toHaveAttribute("data-layout", "two-row");
      expect(deck).toHaveAttribute("data-gap-mode", "wrapped-fluid");
      expect(deck.style.columnGap).toBe("50.4px");
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth
    });
    rectSpy.mockRestore();
  });
});
