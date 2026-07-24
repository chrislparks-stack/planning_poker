const LEGACY_ROOM_KEY = "Room";
const ROOM_KEY_PREFIX = "Room:";
const LAST_ROOM_ID_KEY = "LastRoomId";

export interface StoredRoom {
  RoomID: string;
  Cards: (string | number)[];
  RoomName: string | null;
  RoomOwner?: string | null;
  Username?: string;
}

function isStoredRoom(value: unknown): value is StoredRoom {
  if (!value || typeof value !== "object") return false;

  const room = value as Partial<StoredRoom>;
  return typeof room.RoomID === "string" && Array.isArray(room.Cards);
}

function parseStoredRoom(raw: string | null): StoredRoom | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredRoom(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getRoomStorageKey(roomId: string): string {
  return `${ROOM_KEY_PREFIX}${roomId}`;
}

export function getStoredRoom(roomId: string): StoredRoom | null {
  const scopedRoom = parseStoredRoom(
    localStorage.getItem(getRoomStorageKey(roomId))
  );
  if (scopedRoom) return scopedRoom;

  const legacyRoom = parseStoredRoom(localStorage.getItem(LEGACY_ROOM_KEY));
  if (legacyRoom?.RoomID !== roomId) return null;

  setStoredRoom(legacyRoom);
  localStorage.removeItem(LEGACY_ROOM_KEY);
  return legacyRoom;
}

export function setStoredRoom(room: StoredRoom): void {
  localStorage.setItem(getRoomStorageKey(room.RoomID), JSON.stringify(room));
  localStorage.setItem(LAST_ROOM_ID_KEY, room.RoomID);
}

export function updateStoredRoom(
  roomId: string,
  update: Partial<Omit<StoredRoom, "RoomID">>
): StoredRoom | null {
  const room = getStoredRoom(roomId);
  if (!room) return null;

  const updatedRoom = { ...room, ...update };
  setStoredRoom(updatedRoom);
  return updatedRoom;
}

export function getAllStoredRooms(): StoredRoom[] {
  const rooms: StoredRoom[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(ROOM_KEY_PREFIX)) continue;

    const room = parseStoredRoom(localStorage.getItem(key));
    if (room) rooms.push(room);
  }

  const legacyRoom = parseStoredRoom(localStorage.getItem(LEGACY_ROOM_KEY));
  if (
    legacyRoom &&
    !rooms.some((storedRoom) => storedRoom.RoomID === legacyRoom.RoomID)
  ) {
    rooms.push(legacyRoom);
  }

  return rooms;
}

export function getLastStoredRoom(): StoredRoom | null {
  const lastRoomId = localStorage.getItem(LAST_ROOM_ID_KEY);
  if (lastRoomId) {
    const room = getStoredRoom(lastRoomId);
    if (room) return room;
  }

  const legacyRoom = parseStoredRoom(localStorage.getItem(LEGACY_ROOM_KEY));
  if (legacyRoom) {
    setStoredRoom(legacyRoom);
    localStorage.removeItem(LEGACY_ROOM_KEY);
    return legacyRoom;
  }

  return getAllStoredRooms()[0] ?? null;
}

export function removeStoredRoom(roomId: string): void {
  localStorage.removeItem(getRoomStorageKey(roomId));

  const legacyRoom = parseStoredRoom(localStorage.getItem(LEGACY_ROOM_KEY));
  if (legacyRoom?.RoomID === roomId) {
    localStorage.removeItem(LEGACY_ROOM_KEY);
  }

  if (localStorage.getItem(LAST_ROOM_ID_KEY) === roomId) {
    const fallbackRoom = getAllStoredRooms().find(
      (room) => room.RoomID !== roomId
    );

    if (fallbackRoom) {
      localStorage.setItem(LAST_ROOM_ID_KEY, fallbackRoom.RoomID);
    } else {
      localStorage.removeItem(LAST_ROOM_ID_KEY);
    }
  }
}

export function removeAllStoredRooms(): void {
  const keysToRemove: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key === LEGACY_ROOM_KEY ||
      key === LAST_ROOM_ID_KEY ||
      key?.startsWith(ROOM_KEY_PREFIX)
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
