import { describe, expect, test } from "vitest";

import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { OptionDialogContent } from "@/components/ui/option-dialog-content";
import { render, screen } from "@test";

describe("OptionDialogContent", () => {
  test("keeps option dialogs below the fixed room header", () => {
    render(
      <Dialog open>
        <OptionDialogContent data-testid="option-dialog">
          <DialogTitle>Options</DialogTitle>
          <DialogDescription>Configure this option.</DialogDescription>
        </OptionDialogContent>
      </Dialog>
    );

    expect(screen.getByTestId("option-dialog")).toHaveClass(
      "top-[calc(50%+1.75rem)]",
      "max-h-[calc(100dvh-4.5rem)]",
      "overflow-hidden",
      "rounded-2xl"
    );
  });
});
