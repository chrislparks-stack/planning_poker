import { createRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ChatInputWrapper } from "@/components/ui/chat-input-wrapper";
import { render, screen, waitFor } from "@test";

vi.mock("@/components/ui/chat-input", () => ({
  ChatInput: ({ className }: { className?: string }) => (
    <div
      data-testid="floating-chat-input"
      className={className}
      style={{ width: 220, height: 96 }}
    />
  )
}));

const setAnchorRect = (
  element: HTMLElement,
  { left, top }: { left: number; top: number }
) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    right: left + 64,
    bottom: top + 96,
    width: 64,
    height: 96,
    toJSON: () => ({})
  });
};

describe("ChatInputWrapper", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 800
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600
    });
  });

  test("anchors the composer directly beside the measured card", async () => {
    const anchorRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <>
        <div ref={anchorRef} />
        <ChatInputWrapper
          anchorRef={anchorRef}
          isOpen
          isLeftSide={false}
          onClose={vi.fn()}
          onSend={vi.fn()}
        />
      </>
    );

    setAnchorRect(anchorRef.current!, { left: 300, top: 120 });
    rerender(
      <>
        <div ref={anchorRef} />
        <ChatInputWrapper
          anchorRef={anchorRef}
          isOpen
          isLeftSide={false}
          onClose={vi.fn()}
          onSend={vi.fn()}
        />
      </>
    );

    const wrapper = screen.getByTestId("floating-chat-input").parentElement!;
    await waitFor(() => {
      expect(wrapper).toHaveStyle({
        left: "376px",
        top: "120px",
        visibility: "visible"
      });
    });
  });

  test("flips to the open side when the preferred side is too narrow", async () => {
    const anchorRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <>
        <div ref={anchorRef} />
        <ChatInputWrapper
          anchorRef={anchorRef}
          isOpen
          isLeftSide
          onClose={vi.fn()}
          onSend={vi.fn()}
        />
      </>
    );

    setAnchorRect(anchorRef.current!, { left: 20, top: 120 });
    rerender(
      <>
        <div ref={anchorRef} />
        <ChatInputWrapper
          anchorRef={anchorRef}
          isOpen
          isLeftSide
          onClose={vi.fn()}
          onSend={vi.fn()}
        />
      </>
    );

    const wrapper = screen.getByTestId("floating-chat-input").parentElement!;
    await waitFor(() => {
      expect(wrapper).toHaveStyle({
        left: "96px",
        top: "120px",
        visibility: "visible"
      });
    });
  });
});
