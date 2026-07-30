import { beforeEach, describe, expect, test, vi } from "vitest";

import { VoteSessionPanel } from "@/components/VoteSessionPanel";
import type { Room } from "@/types";
import { fireEvent, render, screen, userEvent, waitFor, within } from "@test";

const apiMocks = vi.hoisted(() => ({
  addQueueItem: vi.fn().mockResolvedValue({}),
  removeQueueItem: vi.fn().mockResolvedValue({}),
  renameQueueItem: vi.fn().mockResolvedValue({}),
  reorderQueueItem: vi.fn().mockResolvedValue({}),
  returnQueueItem: vi.fn().mockResolvedValue({}),
  startQueueItem: vi.fn().mockResolvedValue({})
}));

vi.mock("@/api", () => ({
  useAddVoteQueueItemMutation: () => [
    apiMocks.addQueueItem,
    { loading: false }
  ],
  useRemoveVoteQueueItemMutation: () => [apiMocks.removeQueueItem],
  useRenameVoteQueueItemMutation: () => [apiMocks.renameQueueItem],
  useReorderVoteQueueItemMutation: () => [apiMocks.reorderQueueItem],
  useReturnCurrentVoteQueueItemMutation: () => [
    apiMocks.returnQueueItem,
    { loading: false }
  ],
  useStartVoteQueueItemMutation: () => [apiMocks.startQueueItem]
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock("@/contexts", () => ({
  useAuth: () => ({ user: { id: "user-1", username: "Chris" } })
}));

const room: Room = {
  id: "room-1",
  name: "History room",
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
    table: []
  },
  isGameOver: false,
  lockVotes: false,
  revealStage: "voting",
  roomOwnerId: "user-1",
  showVoteChanges: true,
  voteHistory: [
    {
      id: "round-1",
      completedAt: "2026-07-28T14:38:00Z",
      issueTitle: "Receipt accessibility",
      revoteCount: 0,
      roundNumber: 1,
      votes: [
        {
          card: "8",
          value: 8,
          selections: [{ card: "8", value: 8, phase: 0 }],
          userId: "user-1",
          username: "Chris"
        }
      ]
    },
    {
      id: "round-2",
      completedAt: "2026-07-28T15:05:00Z",
      issueTitle: null,
      revoteCount: 0,
      roundNumber: 2,
      votes: [
        {
          card: "5",
          value: 5,
          selections: [
            { card: "3", value: 3, phase: 0 },
            { card: "5", value: 5, phase: 0 }
          ],
          userId: "user-1",
          username: "Chris"
        },
        {
          card: "5",
          value: 5,
          selections: [{ card: "5", value: 5, phase: 0 }],
          userId: "user-2",
          username: "Justin"
        },
        {
          card: "5",
          value: 5,
          selections: [
            { card: "8", value: 8, phase: 0 },
            { card: "5", value: 5, phase: 0 }
          ],
          userId: "user-3",
          username: "Maya"
        }
      ]
    }
  ],
  voteQueue: [],
  users: [
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
  ]
};

describe("VoteSessionPanel history", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn()
      }))
    );
  });

  test("defaults closed and remembers the user's panel preference", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<VoteSessionPanel room={room} />);

    const openRail = screen.getByRole("button", {
      name: "Open vote session"
    });
    expect(openRail).toHaveClass("h-full", "w-full");
    expect(screen.queryByText("History · 2")).not.toBeInTheDocument();

    await user.click(within(openRail).getByText("Vote session"));

    expect(localStorage.getItem("vote-session-panel-open")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Collapse vote session" })
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: /Up next/ }).closest("section")!
      ).getByRole("button", { name: "Add item" })
    ).toBeInTheDocument();

    unmount();
    render(<VoteSessionPanel room={room} />);

    expect(
      screen.getByRole("button", { name: "Collapse vote session" })
    ).toBeInTheDocument();
  });

  test("counts unread history cards on the collapsed rail and marks them read when opened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<VoteSessionPanel room={room} />);

    expect(
      screen.getByLabelText("2 unread vote session history cards")
    ).toHaveTextContent("2");

    await user.click(
      screen.getByRole("button", {
        name: "Open vote session"
      })
    );
    await user.click(
      screen.getByRole("button", {
        name: "Collapse vote session"
      })
    );

    expect(
      screen.queryByLabelText(/unread vote session history/)
    ).not.toBeInTheDocument();

    rerender(
      <VoteSessionPanel
        room={{
          ...room,
          voteHistory: [
            ...room.voteHistory,
            {
              ...room.voteHistory[0],
              id: "round-3",
              completedAt: "2026-07-28T16:05:00Z",
              roundNumber: 3
            }
          ]
        }}
      />
    );

    expect(
      screen.getByLabelText("1 unread vote session history card")
    ).toHaveTextContent("1");
  });

  test("resizes from the middle handle and remembers the width", () => {
    localStorage.setItem("vote-session-panel-open", "true");
    localStorage.setItem("vote-session-panel-width", "420");
    render(<VoteSessionPanel room={room} />);

    const resizeHandle = screen.getByRole("button", {
      name: "Resize vote session panel"
    });
    expect(resizeHandle).toHaveClass(
      "right-0",
      "translate-x-full",
      "rounded-r-full",
      "cursor-grab",
      "active:cursor-grabbing"
    );
    expect(resizeHandle).not.toHaveClass("rounded-l-full", "translate-x-[60%]");

    fireEvent.keyDown(resizeHandle, { key: "ArrowRight" });

    expect(localStorage.getItem("vote-session-panel-width")).toBe("436");
    expect(screen.getByLabelText("Vote session")).toHaveStyle({
      "--vote-session-panel-width": "436px"
    });
  });

  test("shows wireframe metrics and expandable vote changes", async () => {
    const user = userEvent.setup();
    localStorage.setItem("vote-session-panel-open", "true");
    render(<VoteSessionPanel room={room} />);

    const newestRoundButton = screen.getByRole("button", {
      name: /5 Round 2 Avg 5\.0 100% agreement 3 Votes/
    });
    const expandedRound = newestRoundButton.closest("article");

    expect(expandedRound).not.toBeNull();
    expect(within(expandedRound!).queryByText("Chris")).not.toBeInTheDocument();

    await user.click(newestRoundButton);

    const chrisVote = within(expandedRound!).getByText("Chris").parentElement;
    const mayaVote = within(expandedRound!).getByText("Maya").parentElement;

    expect(chrisVote).toHaveTextContent("Chris35");
    expect(within(expandedRound!).getByText("Justin")).toBeInTheDocument();
    expect(mayaVote).toHaveTextContent("Maya85");
    expect(within(expandedRound!).getByText(/^Completed /)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /8 Receipt accessibility Avg 8\.0 100% agreement 1 Votes/
      })
    );

    expect(screen.getByText("Receipt accessibility")).toBeInTheDocument();
    expect(
      screen
        .getByRole("button", {
          name: /5 Round 2 Avg 5\.0 100% agreement 3 Votes/
        })
        .closest("article")
    ).not.toHaveTextContent("Chris");
  });

  test("labels a revote and compares its overall results", async () => {
    const user = userEvent.setup();
    localStorage.setItem("vote-session-panel-open", "true");
    const revoteRoom: Room = {
      ...room,
      voteHistory: [
        {
          id: "round-revote",
          completedAt: "2026-07-28T16:05:00Z",
          issueTitle: null,
          revoteCount: 1,
          roundNumber: 3,
          votes: [
            {
              card: "5",
              value: 5,
              selections: [
                { card: "3", value: 3, phase: 0 },
                { card: "5", value: 5, phase: 1 }
              ],
              userId: "user-1",
              username: "Chris"
            }
          ]
        }
      ]
    };

    render(<VoteSessionPanel room={revoteRoom} />);
    const roundButton = screen.getByRole("button", {
      name: /5 Round 3 Revote Avg 5\.0 100% agreement 1 Votes/
    });

    await user.click(roundButton);

    expect(screen.getByText("Original result")).toBeInTheDocument();
    expect(screen.getByText("Final result")).toBeInTheDocument();
    expect(screen.getAllByText("Revote")).toHaveLength(3);
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  test("puts an open queued item on the table from a double click", async () => {
    const user = userEvent.setup();
    localStorage.setItem("vote-session-panel-open", "true");
    render(
      <VoteSessionPanel
        room={{
          ...room,
          voteQueue: [{ id: "queue-1", title: "Checkout validation" }]
        }}
      />
    );

    const queueItem = screen.getByRole("listitem");
    expect(queueItem).toHaveTextContent("Double-click to put on table");

    await user.dblClick(queueItem);

    expect(apiMocks.startQueueItem).toHaveBeenCalledWith({
      variables: {
        itemId: "queue-1",
        roomId: "room-1",
        userId: "user-1"
      }
    });
  });

  test("clearly labels queue-item rename mode and saves with Enter", async () => {
    const user = userEvent.setup();
    localStorage.setItem("vote-session-panel-open", "true");
    render(
      <VoteSessionPanel
        room={{
          ...room,
          voteQueue: [{ id: "queue-1", title: "Checkout validation" }]
        }}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Manage Checkout validation" })
    );
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));

    const renameInput = screen.getByRole("textbox", {
      name: "Rename Checkout validation"
    });
    expect(renameInput).toHaveAccessibleDescription(
      "Renaming · Enter to save · Esc to cancel"
    );
    expect(screen.getByText("Renaming")).toBeInTheDocument();
    await waitFor(() => expect(renameInput).toHaveFocus());
    expect(renameInput).toHaveProperty("selectionStart", 0);
    expect(renameInput).toHaveProperty(
      "selectionEnd",
      "Checkout validation".length
    );

    await user.clear(renameInput);
    await user.type(renameInput, "Checkout error states{Enter}");

    expect(apiMocks.renameQueueItem).toHaveBeenCalledWith({
      variables: {
        itemId: "queue-1",
        roomId: "room-1",
        title: "Checkout error states",
        userId: "user-1"
      }
    });
  });

  test("returns the current queued issue to the queue from Current Vote", async () => {
    const user = userEvent.setup();
    localStorage.setItem("vote-session-panel-open", "true");
    render(
      <VoteSessionPanel
        room={{
          ...room,
          currentIssueTitle: "Checkout validation",
          currentQueueItemId: "queue-1"
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Return to queue" }));

    expect(apiMocks.returnQueueItem).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1"
      }
    });
  });

  test("shows every winning story-point value when a result is tied", () => {
    localStorage.setItem("vote-session-panel-open", "true");
    const tiedVotes = [
      {
        card: "2",
        value: 2,
        selections: [{ card: "2", value: 2, phase: 0 }],
        userId: "user-1",
        username: "Chris"
      },
      {
        card: "3",
        value: 3,
        selections: [{ card: "3", value: 3, phase: 0 }],
        userId: "user-2",
        username: "Justin"
      }
    ];

    render(
      <VoteSessionPanel
        room={{
          ...room,
          game: {
            ...room.game,
            table: [
              { userId: "user-1", card: "2" },
              { userId: "user-2", card: "3" }
            ]
          },
          isGameOver: true,
          users: [
            { ...room.users[0], lastCardPicked: "2", lastCardValue: 2 },
            {
              ...room.users[0],
              id: "user-2",
              username: "Justin",
              lastCardPicked: "3",
              lastCardValue: 3
            }
          ],
          voteHistory: [
            {
              id: "tied-round",
              completedAt: "2026-07-29T17:00:00Z",
              issueTitle: null,
              revoteCount: 0,
              roundNumber: 1,
              votes: tiedVotes
            }
          ]
        }}
      />
    );

    expect(screen.getByText("2 | 3")).toBeInTheDocument();
    expect(screen.getByLabelText("2 and 3 tie")).toBeInTheDocument();
  });
});
