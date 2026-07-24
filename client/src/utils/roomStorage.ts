const LEGACY_ROOM_KEY = "Room";
const ROOM_KEY_PREFIX = "Room:";
const LAST_ROOM_ID_KEY = "LastRoomId";

export interface StoredRoom {
  RoomID: string;
  Cards: (string | number)[];
  RoomName: string | null;
  RoomOwner?: string | null;
  Username?: string;
  LastActiveAt?: number;
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

  setStoredRoom(legacyRoom, false);
  localStorage.removeItem(LEGACY_ROOM_KEY);
  return legacyRoom;
}

export function setStoredRoom(room: StoredRoom, markActive = true): void {
  const storedRoom = {
    ...room,
    LastActiveAt: room.LastActiveAt ?? (markActive ? Date.now() : undefined)
  };

  localStorage.setItem(
    getRoomStorageKey(storedRoom.RoomID),
    JSON.stringify(storedRoom)
  );
  if (markActive) {
    localStorage.setItem(LAST_ROOM_ID_KEY, storedRoom.RoomID);
  }
}

export function updateStoredRoom(
  roomId: string,
  update: Partial<Omit<StoredRoom, "RoomID">>
): StoredRoom | null {
  const room = getStoredRoom(roomId);
  if (!room) return null;

  const updatedRoom = { ...room, ...update };
  setStoredRoom(updatedRoom, false);
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

  const lastRoomId = localStorage.getItem(LAST_ROOM_ID_KEY);
  return rooms.sort((left, right) => {
    const activityDifference =
      (right.LastActiveAt ?? 0) - (left.LastActiveAt ?? 0);
    if (activityDifference !== 0) return activityDifference;

    if (left.RoomID === lastRoomId) return -1;
    if (right.RoomID === lastRoomId) return 1;
    return left.RoomID.localeCompare(right.RoomID);
  });
}

export function getLastStoredRoom(): StoredRoom | null {
  const legacyRoom = parseStoredRoom(localStorage.getItem(LEGACY_ROOM_KEY));
  if (legacyRoom) {
    setStoredRoom(legacyRoom, false);
    localStorage.removeItem(LEGACY_ROOM_KEY);
  }

  return getAllStoredRooms()[0] ?? null;
}

export function touchStoredRoom(
  roomId: string,
  lastActiveAt = Date.now()
): StoredRoom | null {
  const room = getStoredRoom(roomId);
  if (!room) return null;

  const updatedRoom = { ...room, LastActiveAt: lastActiveAt };
  setStoredRoom(updatedRoom, false);
  localStorage.setItem(LAST_ROOM_ID_KEY, roomId);
  return updatedRoom;
}

export function isRoomStorageKey(key: string | null): boolean {
  return (
    key === null ||
    key === LEGACY_ROOM_KEY ||
    key === LAST_ROOM_ID_KEY ||
    key.startsWith(ROOM_KEY_PREFIX)
  );
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
