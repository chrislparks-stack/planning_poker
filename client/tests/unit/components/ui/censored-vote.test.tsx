import { describe, expect, test } from "vitest";

import { CensoredVote } from "@/components/ui/censored-vote";
import { render, screen } from "@test";

describe("CensoredVote", () => {
  test("visually obscures the vote without exposing it as accessible text", () => {
    render(<CensoredVote value="13" />);

    const censoredVote = screen.getByRole("img", { name: "Vote censored" });
    const obscuredValue = screen.getByText("13");

    expect(censoredVote).toHaveAttribute("data-testid", "censored-vote");
    expect(obscuredValue).toHaveAttribute("aria-hidden", "true");
    expect(obscuredValue).toHaveClass("blur-[7px]", "select-none");
  });
});
