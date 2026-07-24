import { render, screen, userEvent } from "@/test";
import { ReactionKind } from "@/types";

import { PlayerReactionBurst, QuickReactionPicker } from "./player-reaction";

const sendReaction = vi.fn().mockResolvedValue({});

vi.mock("@/api", () => ({
  useSendReactionMutation: () => [sendReaction, { loading: false }]
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe("QuickReactionPicker", () => {
  beforeEach(() => sendReaction.mockClear());

  test("shows five story-point reactions in one compact hover tray", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <QuickReactionPicker
        roomId="room-1"
        userId="user-1"
        open
        onClose={onClose}
        openBelow={false}
        onMenuEnter={vi.fn()}
        onMenuLeave={vi.fn()}
        handRaised={false}
      />
    );

    expect([
      ...screen.getAllByRole("menuitem"),
      ...screen.getAllByRole("menuitemcheckbox")
    ]).toHaveLength(5);
    await user.click(screen.getByRole("menuitem", { name: "Question" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sendReaction).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1",
        reaction: ReactionKind.Confused
      }
    });
  });

  test("shows a raised hand as selected and toggles it off", async () => {
    const user = userEvent.setup();
    render(
      <QuickReactionPicker
        roomId="room-1"
        userId="user-1"
        open
        onClose={vi.fn()}
        openBelow={false}
        onMenuEnter={vi.fn()}
        onMenuLeave={vi.fn()}
        handRaised
      />
    );

    const lowerHand = screen.getByRole("menuitemcheckbox", {
      name: "Lower hand"
    });
    expect(lowerHand).toHaveAttribute("aria-checked", "true");
    await user.click(lowerHand);

    expect(sendReaction).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1",
        reaction: ReactionKind.RaiseHand
      }
    });
  });

  test("renders an anchored burst for a received reaction event", () => {
    const { container } = render(
      <PlayerReactionBurst
        eventId="reaction-1"
        reaction={ReactionKind.Celebrate}
      />
    );

    expect(
      container.querySelector('[data-reaction-burst="CELEBRATE"]')
    ).toBeInTheDocument();
  });

  test.each([
    [ReactionKind.Celebrate, "confetti"],
    [ReactionKind.Confused, "floating-questions"],
    [ReactionKind.Heart, "floating-hearts"],
    [ReactionKind.Laugh, "laugh-bounce"],
    [ReactionKind.RaiseHand, "raised-hand-wave"]
  ])("uses a distinct %s animation", (reaction, animation) => {
    const { container } = render(
      <PlayerReactionBurst
        eventId={`reaction-${reaction}`}
        reaction={reaction}
      />
    );

    expect(
      container.querySelector(`[data-reaction-animation="${animation}"]`)
    ).toBeInTheDocument();
  });
});
