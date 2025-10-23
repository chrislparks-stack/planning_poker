import {useParams, useRouter} from "@tanstack/react-router";
import { useCreateRoomMutation } from "@/api";

export function MissingRoomPage() {
  const router = useRouter();
  const navigate = router.navigate;
  const { roomId } = useParams({ from: "/missing-room/$roomId" });

  const [createRoomMutation, { loading, error }] = useCreateRoomMutation({
    onCompleted: (data) => {
      const newId = data?.createRoom?.id;
      if (!newId) return;

      navigate({ to: `/room/${newId}`, replace: true });
    },
  });

  return (
    <div className="flex flex-col h-screen items-center justify-center text-center space-y-6 px-4">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
        This room no longer exists
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
        The link you followed points to a room that has been deleted or expired.
        You can recreate it now to start a new session.
      </p>

      <button
        disabled={loading}
        onClick={() => {
          localStorage.removeItem("Room");
          localStorage.removeItem("user");
          sessionStorage.setItem("NEW_ROOM_CREATED", "true");

          createRoomMutation({
            variables: {
              roomId,
              name: `Restored from ${roomId}`,
              cards: [],
            },
          });
        }}

        className={`px-6 py-2.5 rounded-md bg-accent text-white font-medium transition ${
          loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
        }`}
      >
        {loading ? "Recreating..." : "Recreate Room"}
      </button>

      {error && <p className="text-sm text-red-500">Error: {error.message}</p>}

      <button
        onClick={() => navigate({ to: "/" })}
        className="text-sm text-accent underline hover:opacity-75 transition"
      >
        Return Home
      </button>
    </div>
  );
}
