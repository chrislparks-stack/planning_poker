import type { Room } from "@/types";

export function getCurrentRoundNumber(
  room: Pick<Room, "previousRound" | "voteHistory">
) {
  return room.previousRound?.roundNumber ?? room.voteHistory.length + 1;
}

export function getCurrentVoteTitle(
  room: Pick<Room, "currentIssueTitle" | "previousRound" | "voteHistory">
) {
  return (
    room.currentIssueTitle?.trim() ||
    `Quick vote (Round ${getCurrentRoundNumber(room)})`
  );
}
