import { createLazyFileRoute } from "@tanstack/react-router";
import { MissingRoomPage } from "@/pages/NotFoundPage/MissingRoomPage";

export const Route = createLazyFileRoute("/missing-room/$roomId")({
    component: MissingRoomPage,
});
