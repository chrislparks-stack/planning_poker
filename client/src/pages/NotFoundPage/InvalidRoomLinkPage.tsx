import {useNavigate, useParams} from "@tanstack/react-router";

export function InvalidRoomLinkPage() {
  const navigate = useNavigate();
  const { roomId } = useParams({ from: "/invalid-room/$roomId" });

  return (
    <div className="flex flex-col h-screen items-center justify-center text-center space-y-6 px-4">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
        Invalid Room Link
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
        The room ID provided (
        <span className="font-mono break-all">{roomId}</span>
        ) isn’t a valid room link. It may have been mistyped, corrupted, or
        modified. For your security, we can’t recreate rooms from invalid IDs.
      </p>

      <button
        onClick={() => navigate({ to: "/" })}
        className="px-6 py-2.5 rounded-md bg-accent text-white font-medium hover:opacity-90 transition"
      >
        Return Home
      </button>
    </div>
  );
}
