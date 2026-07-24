import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResultsTag } from "./results-tag";

describe("ResultsTag", () => {
  it("marks the divider when a room background is active", () => {
    const { rerender } = render(<ResultsTag />);
    const divider = screen.getByText("VOTE DISTRIBUTION").parentElement;

    expect(divider).not.toHaveAttribute("data-background");

    rerender(<ResultsTag hasBackground />);

    expect(divider).toHaveAttribute("data-background", "true");
  });
});
