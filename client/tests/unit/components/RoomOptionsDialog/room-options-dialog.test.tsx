import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { RoomOptionsDialog } from "@/components/RoomOptionsDialog";
import { Room } from "@/types";
import { render, screen, userEvent } from "@test";

const apiMocks = vi.hoisted(() => ({
  renameRoom: vi.fn().mockResolvedValue({}),
  updateDeck: vi.fn().mockResolvedValue({}),
  toggleCountdown: vi.fn().mockResolvedValue({}),
  toggleConfirm: vi.fn().mockResolvedValue({}),
  toggleVoteChanges: vi.fn().mockResolvedValue({})
}));

vi.mock("@/api", () => ({
  useRenameRoomMutation: () => [apiMocks.renameRoom, { loading: false }],
  useUpdateDeckMutation: () => [apiMocks.updateDeck, { loading: false }],
  useToggleCountdownOptionMutation: () => [
    apiMocks.toggleCountdown,
    { loading: false }
  ],
  useToggleConfirmNewGameMutation: () => [
    apiMocks.toggleConfirm,
    { loading: false }
  ],
  useToggleShowVoteChangesMutation: () => [
    apiMocks.toggleVoteChanges,
    { loading: false }
  ]
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
});

const room: Room = {
  id: "room-1",
  name: "Design review",
  bannedUsers: [],
  chatHistory: [],
  confirmNewGame: true,
  countdownEnabled: false,
  countdownValue: null,
  deck: {
    id: "deck-1",
    cards: ["1", "2", "3", "5", "8"]
  },
  game: {
    id: "game-1",
    table: []
  },
  isGameOver: false,
  revealStage: "idle",
  roomOwnerId: "user-1",
  showVoteChanges: true,
  users: []
};

describe("RoomOptionsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("organizes existing controls and scalable behavior settings", () => {
    render(<RoomOptionsDialog open setOpen={vi.fn()} room={room} />);

    expect(
      screen.getByRole("heading", { name: "Room options" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Room identity" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Voting deck" })
    ).toBeInTheDocument();
    expect(screen.getByText("Round behavior")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.getByDisplayValue("Design review")).toBeInTheDocument();
    expect(screen.getByTestId("room-options-dialog")).toHaveClass(
      "top-[calc(50%+1.75rem)]",
      "max-h-[calc(100dvh-4.5rem)]"
    );
  });

  test("defaults vote changes on and updates the room setting immediately", async () => {
    const user = userEvent.setup();
    render(<RoomOptionsDialog open setOpen={vi.fn()} room={room} />);

    const showVoteChanges = screen.getByRole("switch", {
      name: "Show vote changes"
    });
    expect(showVoteChanges).toHaveAttribute("aria-checked", "true");

    await user.click(showVoteChanges);

    expect(apiMocks.toggleVoteChanges).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        enabled: false
      }
    });
    expect(showVoteChanges).toHaveAttribute("aria-checked", "false");
  });

  test("preserves name drafts when a setting publishes a new room snapshot", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RoomOptionsDialog open setOpen={vi.fn()} room={room} />
    );

    const roomName = screen.getByLabelText("Room name");
    await user.clear(roomName);
    await user.type(roomName, "Draft room name");

    rerender(
      <RoomOptionsDialog
        open
        setOpen={vi.fn()}
        room={{ ...room, showVoteChanges: false }}
      />
    );

    expect(screen.getByLabelText("Room name")).toHaveValue("Draft room name");
  });
});
