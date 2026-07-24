import { useState } from "react";
import { beforeAll, vi } from "vitest";

import { CardFan } from "@/components/ui/card-fan";
import { render, screen, userEvent } from "@test";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
});

function CardForm({ onSubmit }: { onSubmit: () => void }) {
  const [selectedCards, setSelectedCards] = useState<(string | number)[]>([
    0, 1, 2
  ]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="username">Username</label>
      <input id="username" />
      <CardFan
        selectedCards={selectedCards}
        toggleCardSelection={(card) =>
          setSelectedCards((current) =>
            current.includes(card)
              ? current.filter((selected) => selected !== card)
              : [...current, card]
          )
        }
      />
      <button type="submit">Create Room</button>
    </form>
  );
}

describe("CardFan form behavior", () => {
  test("selecting a card does not submit its parent form", async () => {
    const onSubmit = vi.fn();
    render(<CardForm onSubmit={onSubmit} />);

    const zeroCard = screen.getByRole("button", { name: "0" });
    expect(zeroCard).toHaveAttribute("type", "button");

    await userEvent.click(zeroCard);

    expect(zeroCard).toHaveAttribute("aria-pressed", "false");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("pressing Enter submits without toggling the first card", async () => {
    const onSubmit = vi.fn();
    render(<CardForm onSubmit={onSubmit} />);

    const zeroCard = screen.getByRole("button", { name: "0" });
    const username = screen.getByRole("textbox", { name: "Username" });

    expect(zeroCard).toHaveAttribute("aria-pressed", "true");
    await userEvent.type(username, "Test User{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(zeroCard).toHaveAttribute("aria-pressed", "true");
  });
});
