import { beforeEach, describe, expect, it } from "vitest";

import {
  getLastStoredRoom,
  getRoomStorageKey,
  getStoredRoom,
  removeStoredRoom,
  setStoredRoom,
  updateStoredRoom
} from "@/utils/roomStorage";

describe("roomStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps metadata and usernames isolated by room ID", () => {
    setStoredRoom({
      RoomID: "room-a",
      Cards: ["1", "2"],
      RoomName: "Room A",
      RoomOwner: "user-a",
      Username: "Name in A"
    });
    setStoredRoom({
      RoomID: "room-b",
      Cards: ["3", "5"],
      RoomName: "Room B",
      RoomOwner: "user-b",
      Username: "Name in B"
    });

    updateStoredRoom("room-a", {
      Cards: ["8"],
      RoomName: "Renamed A",
      Username: "Renamed in A"
    });

    expect(getStoredRoom("room-a")).toEqual({
      RoomID: "room-a",
      Cards: ["8"],
      RoomName: "Renamed A",
      RoomOwner: "user-a",
      Username: "Renamed in A"
    });
    expect(getStoredRoom("room-b")).toEqual({
      RoomID: "room-b",
      Cards: ["3", "5"],
      RoomName: "Room B",
      RoomOwner: "user-b",
      Username: "Name in B"
    });
    expect(localStorage.getItem(getRoomStorageKey("room-a"))).not.toEqual(
      localStorage.getItem(getRoomStorageKey("room-b"))
    );
  });

  it("removes only the selected room and retains another return target", () => {
    setStoredRoom({
      RoomID: "room-a",
      Cards: [],
      RoomName: "Room A"
    });
    setStoredRoom({
      RoomID: "room-b",
      Cards: [],
      RoomName: "Room B"
    });

    removeStoredRoom("room-b");

    expect(getStoredRoom("room-b")).toBeNull();
    expect(getStoredRoom("room-a")?.RoomName).toBe("Room A");
    expect(getLastStoredRoom()?.RoomID).toBe("room-a");
  });

  it("migrates the legacy single-room record without deleting scoped rooms", () => {
    localStorage.setItem(
      "Room",
      JSON.stringify({
        RoomID: "legacy-room",
        Cards: ["1"],
        RoomName: "Legacy",
        Username: "Legacy Name"
      })
    );
    setStoredRoom({
      RoomID: "scoped-room",
      Cards: ["2"],
      RoomName: "Scoped",
      Username: "Scoped Name"
    });

    expect(getStoredRoom("legacy-room")?.Username).toBe("Legacy Name");
    expect(getStoredRoom("scoped-room")?.Username).toBe("Scoped Name");
    expect(localStorage.getItem("Room")).toBeNull();
  });
});
