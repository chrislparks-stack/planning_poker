import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { VoteAdjustment } from "@/components/ui/vote-adjustment";

describe("VoteAdjustment", () => {
  test.each([
    [
      3,
      5,
      "up",
      "Vote increased from 3 to 5",
      "text-emerald-700",
      "dark:text-emerald-400",
      "[.starry_&]:text-emerald-400"
    ],
    [
      8,
      5,
      "down",
      "Vote decreased from 8 to 5",
      "text-rose-700",
      "dark:text-rose-400",
      "[.starry_&]:text-rose-400"
    ]
  ])(
    "shows numeric movement from %s to %s",
    (
      previousValue,
      currentValue,
      direction,
      label,
      lightColorClass,
      darkColorClass,
      starryColorClass
    ) => {
      const { container, rerender } = render(
        <VoteAdjustment
          currentCard={String(previousValue)}
          currentValue={previousValue}
          previousCard={String(previousValue)}
          previousValue={previousValue}
        />
      );

      rerender(
        <VoteAdjustment
          currentCard={String(currentValue)}
          currentValue={currentValue}
          previousCard={String(previousValue)}
          previousValue={previousValue}
        />
      );

      expect(screen.getByRole("status", { name: label })).toHaveAttribute(
        "data-vote-adjustment",
        direction
      );
      expect(screen.getByText(`was ${previousValue}`)).toBeInTheDocument();
      expect(screen.getByRole("status", { name: label })).toHaveClass(
        "absolute",
        "top-[22px]",
        lightColorClass,
        darkColorClass,
        starryColorClass
      );
      expect(screen.getByRole("status", { name: label }).className).not.toMatch(
        /rounded|border|bg-/
      );
      expect(
        container.querySelector(`[data-vote-adjustment-burst="${direction}"]`)
      ).toBeInTheDocument();
      const burst = container.querySelector(
        `[data-vote-adjustment-burst="${direction}"]`
      );
      if (direction === "down") {
        expect(burst).toHaveClass("-translate-y-3");
      } else {
        expect(burst).not.toHaveClass("-translate-y-3");
      }
      expect(
        container.querySelectorAll(
          `[data-vote-adjustment-arrow="${direction}"]`
        )
      ).toHaveLength(3);
      expect(
        container.querySelector(
          `[data-vote-adjustment-arrow-icon="${direction}"]`
        )
      ).toHaveClass("h-6", "w-4");
    }
  );

  test("animates from the immediately prior vote, including a return to the original", () => {
    const { container, rerender } = render(
      <VoteAdjustment
        currentCard="3"
        currentValue={3}
        previousCard="3"
        previousValue={3}
      />
    );

    rerender(
      <VoteAdjustment
        currentCard="8"
        currentValue={8}
        previousCard="3"
        previousValue={3}
      />
    );
    expect(
      container.querySelector('[data-vote-adjustment-burst="up"]')
    ).toBeInTheDocument();

    rerender(
      <VoteAdjustment
        currentCard="5"
        currentValue={5}
        previousCard="3"
        previousValue={3}
      />
    );
    expect(
      container.querySelector('[data-vote-adjustment-burst="down"]')
    ).toBeInTheDocument();
    expect(screen.getByText("was 3")).toBeInTheDocument();

    rerender(
      <VoteAdjustment
        currentCard="3"
        currentValue={3}
        previousCard="3"
        previousValue={3}
      />
    );
    expect(
      container.querySelector('[data-vote-adjustment-burst="down"]')
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("shows the prior label when the cards cannot be ordered", () => {
    render(
      <VoteAdjustment
        currentCard="?"
        currentValue={null}
        previousCard="pass"
        previousValue={null}
      />
    );

    expect(
      screen.getByRole("status", { name: "Vote changed from pass to ?" })
    ).toHaveClass("text-glass");
    expect(screen.getByText("was pass")).toBeInTheDocument();
    expect(
      document.querySelector("[data-vote-adjustment-burst]")
    ).not.toBeInTheDocument();
  });

  test("does not show an adjustment before a previous vote exists", () => {
    const { container } = render(
      <VoteAdjustment currentCard="5" currentValue={5} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("animates later changes when no vote existed at reveal", () => {
    const { container, rerender } = render(<VoteAdjustment />);

    rerender(<VoteAdjustment currentCard="3" currentValue={3} />);
    expect(
      container.querySelector("[data-vote-adjustment-burst]")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(<VoteAdjustment currentCard="8" currentValue={8} />);
    expect(
      container.querySelector('[data-vote-adjustment-burst="up"]')
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(<VoteAdjustment currentCard="5" currentValue={5} />);
    expect(
      container.querySelector('[data-vote-adjustment-burst="down"]')
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("disappears when the vote returns to its revealed value", () => {
    const { container } = render(
      <VoteAdjustment
        currentCard="3"
        currentValue={3}
        previousCard="3"
        previousValue={3}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
