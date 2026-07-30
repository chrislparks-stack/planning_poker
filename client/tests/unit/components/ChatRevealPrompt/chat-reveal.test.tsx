import { describe, expect, test, vi } from "vitest";

import { ChatRevealPrompt } from "@/components/ui/chat-reveal";
import { Room } from "@/types";
import { render, screen } from "@test";

const apiMocks = vi.hoisted(() => ({
  markChatSeen: vi.fn()
}));

vi.mock("@/api", () => ({
  useMarkChatSeenMutation: () => [apiMocks.markChatSeen]
}));

vi.mock("@/contexts", () => ({
  useAuth: () => ({ user: { id: "user-1", username: "Chris" } })
}));

describe("ChatRevealPrompt", () => {
  test("keeps the native scrollbar strip outside the chat hit target", () => {
    const room = {
      id: "room-1",
      users: [
        {
          id: "user-1",
          username: "Chris",
          lastSeenChatMessageId: null
        }
      ],
      chatHistory: [
        {
          id: "message-1",
          userId: "user-2"
        }
      ]
    } as Room;

    render(<ChatRevealPrompt onClick={vi.fn()} room={room} chatOpen={false} />);

    expect(screen.getByRole("button", { name: "Open chat" })).toHaveClass(
      "left-0",
      "right-[18px]"
    );
  });
});
