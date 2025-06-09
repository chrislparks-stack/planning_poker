import { createLazyFileRoute } from "@tanstack/react-router";

import { RoomPage } from "@/pages/RoomPage";

export const Route = createLazyFileRoute("/room/$roomId")({
  component: RoomPage
});
