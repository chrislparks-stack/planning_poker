import { createLazyFileRoute } from "@tanstack/react-router";
import { InvalidRoomLinkPage } from "@/pages/NotFoundPage/InvalidRoomLinkPage";

export const Route = createLazyFileRoute("/invalid-room/$roomId")({
    component: InvalidRoomLinkPage,
});
