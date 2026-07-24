import { describe, expect, test } from "vitest";

import { PreviousRoundVoteBadge } from "@/components/Player";
import { render, screen } from "@test";

describe("PreviousRoundVoteBadge", () => {
  test("shows an uncensored player's previous issue vote", () => {
    render(
      <PreviousRoundVoteBadge username="Chris" card="3" censored={false} />
    );

    expect(
      screen.getByRole("status", { name: "Chris's previous vote was 3" })
    ).toHaveAttribute("data-previous-round-vote", "3");
    expect(screen.getByText("prev 3")).toBeInTheDocument();
  });

  test("does not expose the previous vote when individual votes are censored", () => {
    const { container } = render(
      <PreviousRoundVoteBadge username="Chris" card="3" censored />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
