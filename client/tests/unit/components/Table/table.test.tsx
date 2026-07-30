import { createRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Table } from "@/components/Table";
import type { Room } from "@/types";
import { render, screen, userEvent } from "@test";

const apiMocks = vi.hoisted(() => ({
  cancelCountdown: vi.fn().mockResolvedValue({}),
  resetGame: vi.fn().mockResolvedValue({}),
  setCurrentIssueTitle: vi.fn().mockResolvedValue({}),
  setVoteUncensored: vi.fn().mockResolvedValue({}),
  showCards: vi.fn().mockResolvedValue({}),
  startNextQueueItem: vi.fn().mockResolvedValue({}),
  startRevote: vi.fn().mockResolvedValue({}),
  startCountdown: vi.fn().mockResolvedValue({}),
  toggleConfirm: vi.fn().mockResolvedValue({})
}));

vi.mock("@/api", () => ({
  useCancelRevealCountdownMutation: () => [
    apiMocks.cancelCountdown,
    { loading: false }
  ],
  useResetGameMutation: () => [apiMocks.resetGame, { loading: false }],
  useSetCurrentIssueTitleMutation: () => [
    apiMocks.setCurrentIssueTitle,
    { loading: false }
  ],
  useSetVoteUncensoredMutation: () => [
    apiMocks.setVoteUncensored,
    { loading: false }
  ],
  useShowCardsMutation: () => [apiMocks.showCards, { loading: false }],
  useStartNextQueueItemMutation: () => [
    apiMocks.startNextQueueItem,
    { loading: false }
  ],
  useStartRevoteMutation: () => [apiMocks.startRevote, { loading: false }],
  useStartRevealCountdownMutation: () => [
    apiMocks.startCountdown,
    { loading: false }
  ],
  useToggleConfirmNewGameMutation: () => [
    apiMocks.toggleConfirm,
    { loading: false }
  ]
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

const room: Room = {
  id: "room-1",
  name: "Private estimates",
  bannedUsers: [],
  censorVotes: true,
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
    table: [{ userId: "user-1", card: "5" }]
  },
  isGameOver: true,
  lockVotes: false,
  revealStage: "revealed",
  roomOwnerId: "user-1",
  showVoteChanges: true,
  voteHistory: [],
  voteQueue: [],
  users: [
    {
      id: "user-1",
      username: "Chris",
      handRaised: false,
      lastCardPicked: "5",
      lastCardValue: 5,
      previousCardPicked: "5",
      previousCardValue: 5,
      voteUncensored: false
    }
  ]
};

describe("Table vote visibility control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("user", JSON.stringify({ id: "user-1" }));
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1)
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  test("lets a player show and re-hide their own revealed vote", async () => {
    const user = userEvent.setup();
    const innerRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <Table room={room} isGameOver innerRef={innerRef} roomOverlayRef={null} />
    );

    expect(
      screen.getByRole("button", { name: "Start New Game" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show my vote" }));
    expect(apiMocks.setVoteUncensored).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1",
        uncensored: true
      }
    });

    rerender(
      <Table
        room={{
          ...room,
          users: [{ ...room.users[0], voteUncensored: true }]
        }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    await user.click(screen.getByRole("button", { name: "Hide my vote" }));
    expect(apiMocks.setVoteUncensored).toHaveBeenLastCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1",
        uncensored: false
      }
    });
  });

  test("shows segmented new-game and revote actions when vote locking is enabled", async () => {
    const user = userEvent.setup();
    const innerRef = createRef<HTMLDivElement>();
    render(
      <Table
        room={{ ...room, lockVotes: true }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    expect(
      screen.getByRole("button", { name: "Start New Game" })
    ).toBeInTheDocument();

    const newGame = screen.getByRole("button", { name: "Start New Game" });
    const revote = screen.getByRole("button", { name: "Revote Issue" });
    expect(newGame.parentElement).toHaveStyle({
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
    });

    await user.click(revote);
    expect(screen.getByText("Start a revote?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Start another voting pass for this issue. The current result will remain as the original result in this round’s history."
      )
    ).toBeInTheDocument();
    expect(apiMocks.startRevote).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start revote" }));
    expect(apiMocks.startRevote).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1"
      }
    });
  });

  test("confirms before starting a blank new game", async () => {
    const user = userEvent.setup();
    const innerRef = createRef<HTMLDivElement>();
    render(
      <Table room={room} isGameOver innerRef={innerRef} roomOverlayRef={null} />
    );

    await user.click(screen.getByRole("button", { name: "Start New Game" }));

    expect(screen.getByText("Start a new game?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Archive the current result, clear everyone’s selected cards, and start a blank voting round."
      )
    ).toBeInTheDocument();
    expect(apiMocks.resetGame).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start new game" }));
    expect(apiMocks.resetGame).toHaveBeenCalledWith({
      variables: { roomId: "room-1" }
    });
  });

  test("adds the next queue item as a third locked-round action", async () => {
    const user = userEvent.setup();
    const innerRef = createRef<HTMLDivElement>();
    render(
      <Table
        room={{
          ...room,
          lockVotes: true,
          voteQueue: [{ id: "queue-1", title: "Checkout validation" }]
        }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    const next = screen.getByRole("button", { name: "Next Queue Item" });
    expect(next.parentElement).toHaveStyle({
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
    });

    await user.click(next);
    expect(screen.getByText("Start the next queue item?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Archive the current result and start voting on “Checkout validation”, the next item in the queue."
      )
    ).toBeInTheDocument();
    expect(apiMocks.startNextQueueItem).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start next item" }));
    expect(apiMocks.startNextQueueItem).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1"
      }
    });
  });

  test("uses the shared room setting to skip every vote-start confirmation", async () => {
    const user = userEvent.setup();
    const innerRef = createRef<HTMLDivElement>();
    render(
      <Table
        room={{
          ...room,
          confirmNewGame: false,
          lockVotes: true,
          voteQueue: [{ id: "queue-1", title: "Checkout validation" }]
        }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    await user.click(screen.getByRole("button", { name: "Revote Issue" }));
    expect(apiMocks.startRevote).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Queue Item" }));
    expect(apiMocks.startNextQueueItem).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("can disable all vote-start confirmations from a revote dialog", async () => {
    const user = userEvent.setup();
    const innerRef = createRef<HTMLDivElement>();
    render(
      <Table
        room={{ ...room, lockVotes: true }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    await user.click(screen.getByRole("button", { name: "Revote Issue" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: "Don't show this confirmation again"
      })
    );
    await user.click(screen.getByRole("button", { name: "Start revote" }));

    expect(apiMocks.toggleConfirm).toHaveBeenCalledWith({
      variables: { roomId: "room-1", enabled: false }
    });
    expect(apiMocks.startRevote).toHaveBeenCalledTimes(1);
  });

  test("shows the compact round-complete summary to participants", () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-2" }));
    const innerRef = createRef<HTMLDivElement>();

    render(
      <Table
        room={{
          ...room,
          game: {
            ...room.game,
            table: [...room.game.table, { userId: "user-2", card: "5" }]
          },
          users: [
            ...room.users,
            {
              id: "user-2",
              username: "Justin",
              handRaised: false,
              lastCardPicked: "5",
              lastCardValue: 5,
              previousCardPicked: "5",
              previousCardValue: 5,
              voteUncensored: false
            }
          ]
        }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    expect(screen.getByText("You voted 5")).toBeInTheDocument();
    expect(screen.getByText("Round complete")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start New Game" })
    ).not.toBeInTheDocument();
  });

  test("renders agreement as a result meter", () => {
    const innerRef = createRef<HTMLDivElement>();

    render(
      <Table room={room} isGameOver innerRef={innerRef} roomOverlayRef={null} />
    );

    expect(
      screen.getByRole("progressbar", { name: "Agreement" })
    ).toHaveAttribute("aria-valuenow", "100");
  });

  test("shows keyboard guidance after an issue title changes", async () => {
    const user = userEvent.setup();
    const innerRef = createRef<HTMLDivElement>();

    render(
      <Table
        room={{ ...room, currentIssueTitle: "Checkout validation" }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /Checkout validation/ })
    );
    const titleInput = screen.getByRole("textbox", { name: "Issue title" });

    expect(
      screen.queryByText("Enter to save · Esc to cancel")
    ).not.toBeInTheDocument();

    await user.type(titleInput, " errors");

    expect(
      screen.getByText("Enter to save · Esc to cancel")
    ).toBeInTheDocument();
  });

  test("keeps compact rooms legible and gives untitled rounds a friendly label", () => {
    const innerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <Table
        room={{ ...room, currentIssueTitle: null }}
        isGameOver
        innerRef={innerRef}
        roomOverlayRef={null}
      />
    );

    expect(screen.getByText("Quick vote (Round 1)")).toBeInTheDocument();
    expect(innerRef.current).toHaveClass(
      "h-[clamp(146px,14vw,204px)]",
      "w-[clamp(320px,34vw,480px)]"
    );
    expect(
      container.querySelector(".poker-table-felt-backing")
    ).toBeInTheDocument();
  });
});
