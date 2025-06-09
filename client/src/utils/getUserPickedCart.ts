import { UserCard } from "@/types";

export function getPickedUserCard(
  userId?: string,
  table?: UserCard[]
): UserCard | undefined {
  if (!userId) {
    return undefined;
  }

  if (!table || !Array.isArray(table)) {
    return undefined;
  }

  const userCard = table.find((userCard) => userCard.userId === userId);

  return userCard;
}
