import { fireEvent, render, screen } from "@/test";

import { CardPickedIcon } from "./card-picked-icon";

describe("CardPickedIcon", () => {
  test("renders the animated picked-card asset with a native fallback", () => {
    const { container } = render(<CardPickedIcon />);

    const image = screen.getByRole("img", { name: "Card picked" });

    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("src", expect.stringContaining("picked.gif"));

    fireEvent.error(image);

    expect(screen.getByRole("img", { name: "Card picked" })).toHaveClass(
      "bg-[#4ac3a0]"
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
