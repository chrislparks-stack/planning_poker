import {
  PlayerReactionBurst,
  QuickReactionPicker
} from "@/components/ui/player-reaction";
import { ReactionKind } from "@/types";
import { render, screen, userEvent } from "@test";

const sendReaction = vi.fn().mockResolvedValue({});

vi.mock("@/api", () => ({
  useSendReactionMutation: () => [sendReaction, { loading: false }]
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe("QuickReactionPicker", () => {
  beforeEach(() => sendReaction.mockClear());

  test("shows six story-point reactions with thumbs up after the heart", async () => {
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

    const items = screen
      .getByRole("menu")
      .querySelectorAll<HTMLElement>('[role^="menuitem"]');
    expect(
      Array.from(items, (item) => item.getAttribute("aria-label"))
    ).toEqual([
      "Celebrate",
      "Love it",
      "Thumbs up",
      "Laugh",
      "Question",
      "Raise hand"
    ]);
    await user.click(screen.getByRole("menuitem", { name: "Thumbs up" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sendReaction).toHaveBeenCalledWith({
      variables: {
        roomId: "room-1",
        userId: "user-1",
        reaction: ReactionKind.ThumbsUp
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
    [ReactionKind.ThumbsUp, "thumbs-up-pop"],
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
