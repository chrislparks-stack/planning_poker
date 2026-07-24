import { createRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Table } from "@/components/Table";
import type { Room } from "@/types";
import { render, screen, userEvent } from "@test";

const apiMocks = vi.hoisted(() => ({
  cancelCountdown: vi.fn().mockResolvedValue({}),
  resetGame: vi.fn().mockResolvedValue({}),
  setVoteUncensored: vi.fn().mockResolvedValue({}),
  showCards: vi.fn().mockResolvedValue({}),
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
  useSetVoteUncensoredMutation: () => [
    apiMocks.setVoteUncensored,
    { loading: false }
  ],
  useShowCardsMutation: () => [apiMocks.showCards, { loading: false }],
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

  test("shows split new-game and revote actions when vote locking is enabled", async () => {
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
    expect(newGame.parentElement).toHaveClass("w-[86%]");
    expect(newGame).toHaveClass("h-12", "top-0", "w-[55%]");
    expect(revote).toHaveClass("h-10", "top-1", "w-[57%]");
    expect(newGame.className).toContain("82%_100%");
    expect(revote.className).toContain("18%_0");
    expect(revote.className).toContain("hue-rotate(12deg)");

    await user.click(revote);
    expect(apiMocks.startRevote).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1"
      }
    });
  });
});
