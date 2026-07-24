import { USER_KEY } from "@/settings";
import { User } from "@/types";
import { removeAllStoredRooms } from "@/utils/roomStorage";

export function getUserFromLocalStorage(): User | null {
  const maybeUser = localStorage.getItem(USER_KEY);

  if (maybeUser) {
    return JSON.parse(maybeUser) as User;
  }

  return null;
}

export function setUserToLocalStorage(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUserFromLocalStorage(): void {
  localStorage.removeItem(USER_KEY);
}

export function removeRoomFromLocalStorage(): void {
  removeAllStoredRooms();
}
