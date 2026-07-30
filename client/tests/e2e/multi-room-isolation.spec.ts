import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { createRoom, joinRoom } from "./helpers";

const GRAPHQL_URL = "http://127.0.0.1:8000/";

interface SharedRoomSetup {
  pageA: Page;
  pageB: Page;
  roomAId: string;
  roomBId: string;
  userId: string;
}

async function graphql<T>(
  page: Page,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const response = await page.request.post(GRAPHQL_URL, {
    data: { query, variables }
  });
  expect(response.ok()).toBe(true);

  const body = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  expect(body.errors ?? []).toEqual([]);
  expect(body.data).toBeDefined();
  return body.data as T;
}

async function setupSharedUserInTwoRooms(
  context: BrowserContext
): Promise<SharedRoomSetup> {
  const pageA = await context.newPage();
  const roomAUrl = await createRoom(pageA);
  await joinRoom(pageA, "Shared User");
  const roomAId = new URL(roomAUrl).pathname.split("/").at(-1)!;
  const userId = await pageA.evaluate(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) throw new Error("Expected a stored user");
    return JSON.parse(storedUser).id as string;
  });

  const roomBData = await graphql<{ createRoom: { id: string } }>(
    pageA,
    `
      mutation CreateSecondRoom($cards: [String!]!) {
        createRoom(cards: $cards) {
          id
        }
      }
    `,
    { cards: ["1", "2", "3"] }
  );
  const roomBId = roomBData.createRoom.id;

  const pageB = await context.newPage();
  await pageB.goto(`http://localhost:5173/room/${roomBId}`);
  await expect(
    pageB.getByTestId("player").filter({ hasText: "Shared User" })
  ).toBeVisible();

  return { pageA, pageB, roomAId, roomBId, userId };
}

test.describe("multi-tab multi-room isolation", () => {
  test("offers a valid previous room when the most recent room is stale", async ({
    context
  }) => {
    const roomPage = await context.newPage();
    const validRoomUrl = await createRoom(roomPage);
    await joinRoom(roomPage, "Returning User");
    const validRoomId = new URL(validRoomUrl).pathname.split("/").at(-1)!;

    const staleRoomId = await roomPage.evaluate(() => {
      const roomId = crypto.randomUUID();
      localStorage.setItem(
        `Room:${roomId}`,
        JSON.stringify({
          RoomID: roomId,
          Cards: ["1", "2", "3"],
          RoomName: "Missing room",
          RoomOwner: null,
          Username: "Returning User",
          LastActiveAt: Date.now() + 60_000
        })
      );
      localStorage.setItem("LastRoomId", roomId);
      return roomId;
    });

    await roomPage.goto("http://localhost:5173");
    const joinExistingButton = roomPage.getByRole("button", {
      name: "Join Existing Game"
    });
    await expect(joinExistingButton).toBeVisible();
    await joinExistingButton.click();
    await expect(roomPage).toHaveURL(validRoomUrl);
    await expect(
      roomPage.getByTestId("player").filter({ hasText: "Returning User" })
    ).toBeVisible();

    const storedRooms = await roomPage.evaluate(
      ({ missingRoomId, previousRoomId }) => ({
        missingRoom: localStorage.getItem(`Room:${missingRoomId}`),
        lastRoomId: localStorage.getItem("LastRoomId"),
        previousRoom: localStorage.getItem(`Room:${previousRoomId}`)
      }),
      { missingRoomId: staleRoomId, previousRoomId: validRoomId }
    );
    expect(storedRooms.missingRoom).toBeNull();
    expect(storedRooms.lastRoomId).toBe(validRoomId);
    expect(storedRooms.previousRoom).not.toBeNull();
  });

  test("returns to the most recently active room instead of the last joined room", async ({
    context
  }) => {
    const firstRoomPage = await context.newPage();
    const firstRoomUrl = await createRoom(firstRoomPage);
    await firstRoomPage
      .getByPlaceholder("Enter room name")
      .fill("First active room");
    await joinRoom(firstRoomPage, "First Room User");

    const secondRoomPage = await context.newPage();
    await createRoom(secondRoomPage);
    await secondRoomPage
      .getByPlaceholder("Enter room name")
      .fill("Second joined room");
    await joinRoom(secondRoomPage, "Second Room User");

    const homePage = await context.newPage();
    await homePage.goto("http://localhost:5173");
    const joinExistingButton = homePage.getByRole("button", {
      name: "Join Existing Game"
    });
    await expect(joinExistingButton).toBeVisible();
    await joinExistingButton.hover();
    await expect(
      homePage.getByRole("tooltip").getByText("Room: Second joined room")
    ).toBeVisible();

    await firstRoomPage.getByRole("button", { name: "1", exact: true }).click();

    await joinExistingButton.hover();
    await expect(
      homePage.getByRole("tooltip").getByText("Room: First active room")
    ).toBeVisible();
    await joinExistingButton.click();

    await expect(homePage).toHaveURL(firstRoomUrl);
    await expect(
      homePage.getByTestId("player").filter({ hasText: "First Room User" })
    ).toBeVisible();
  });

  test("starting another game opens setup with defaults and reuses the identity", async ({
    context
  }) => {
    const firstRoomPage = await context.newPage();
    await createRoom(firstRoomPage);
    await joinRoom(firstRoomPage, "Shared User");
    const originalUserId = await firstRoomPage.evaluate(() => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) throw new Error("Expected a stored user");
      return JSON.parse(storedUser).id as string;
    });

    const newRoomPage = await context.newPage();
    await newRoomPage.goto("http://localhost:5173");
    await newRoomPage.getByRole("button", { name: "Start New Game" }).click();

    const setupDialog = newRoomPage.getByRole("dialog");
    await expect(
      setupDialog.getByRole("heading", { name: "Setup Room" })
    ).toBeVisible();
    await expect(
      setupDialog.getByRole("heading", { name: "Room options" })
    ).toHaveCount(0);
    await expect(setupDialog.getByPlaceholder("Enter username")).toHaveValue(
      "Shared User"
    );
    await expect(setupDialog.getByPlaceholder("Enter room name")).toHaveValue(
      ""
    );
    await expect(
      setupDialog.getByRole("button", { pressed: true })
    ).toHaveCount(11);

    await setupDialog.getByPlaceholder("Enter room name").fill("Second Room");
    await setupDialog
      .getByPlaceholder("Enter username")
      .fill("Second Room Alias");
    await setupDialog.getByRole("button", { name: "Create Room" }).click();

    await expect(
      newRoomPage.getByTestId("player").filter({ hasText: "Second Room Alias" })
    ).toBeVisible();
    const persistedIdentity = await newRoomPage.evaluate(() => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) throw new Error("Expected a stored user");
      return JSON.parse(storedUser) as { id: string; username: string };
    });
    expect(persistedIdentity).toMatchObject({
      id: originalUserId,
      username: "Shared User"
    });
  });

  test("applies appearance changes in another open room without reopening the dialog", async ({
    context
  }) => {
    const { pageA, pageB } = await setupSharedUserInTwoRooms(context);

    await pageA.evaluate(() => {
      localStorage.setItem("vite-ui-theme", "light");
      localStorage.setItem("accent", "emerald");
      localStorage.setItem(
        "background",
        JSON.stringify({
          enabled: true,
          id: "starry",
          options: {
            gradient: true,
            "shooting-stars": false,
            mountains: false
          }
        })
      );
    });

    await expect
      .poll(() =>
        pageB.evaluate(() => ({
          accent: document.documentElement.dataset.accent,
          isLight: document.documentElement.classList.contains("light")
        }))
      )
      .toEqual({ accent: "emerald", isLight: true });
    await expect(pageB.locator(".sky")).toBeVisible();
    await expect(pageB.locator(".shooting-stars")).toHaveCount(0);
  });

  test("keeps usernames, votes, and persisted room metadata room-scoped", async ({
    context
  }) => {
    const { pageA, pageB, roomAId, roomBId, userId } =
      await setupSharedUserInTwoRooms(context);

    await pageA.getByRole("button", { name: "Account menu" }).click();
    await pageA.getByRole("menuitem", { name: "Change Username" }).click();
    await pageA
      .getByPlaceholder("Enter your new username")
      .fill("Room A Alias");
    await pageA.getByRole("button", { name: "Save username" }).click();

    await expect(
      pageA.getByTestId("player").filter({ hasText: "Room A Alias" })
    ).toBeVisible();
    await expect(
      pageB.getByTestId("player").filter({ hasText: "Shared User" })
    ).toBeVisible();
    await expect(
      pageB.getByTestId("player").filter({ hasText: "Room A Alias" })
    ).toHaveCount(0);

    await pageA.getByRole("button", { name: "1", exact: true }).click();

    const roomState = await graphql<{
      roomA: {
        users: {
          id: string;
          username: string;
          lastCardPicked: string | null;
        }[];
      };
      roomB: {
        users: {
          id: string;
          username: string;
          lastCardPicked: string | null;
        }[];
        game: { table: { userId: string }[] };
      };
    }>(
      pageA,
      `
        query RoomIsolation($roomAId: UUID!, $roomBId: UUID!) {
          roomA: roomById(roomId: $roomAId) {
            users {
              id
              username
              lastCardPicked
            }
          }
          roomB: roomById(roomId: $roomBId) {
            users {
              id
              username
              lastCardPicked
            }
            game {
              table {
                userId
              }
            }
          }
        }
      `,
      { roomAId, roomBId }
    );

    expect(
      roomState.roomA.users.find((user) => user.id === userId)
    ).toMatchObject({
      username: "Room A Alias",
      lastCardPicked: "1"
    });
    expect(
      roomState.roomB.users.find((user) => user.id === userId)
    ).toMatchObject({
      username: "Shared User",
      lastCardPicked: null
    });
    expect(roomState.roomB.game.table).toEqual([]);

    const storedState = await pageB.evaluate(
      ({ firstRoomId, secondRoomId }) => ({
        globalUsername: JSON.parse(localStorage.getItem("user") ?? "{}")
          .username,
        roomA: JSON.parse(
          localStorage.getItem(`Room:${firstRoomId}`) ?? "null"
        ),
        roomB: JSON.parse(
          localStorage.getItem(`Room:${secondRoomId}`) ?? "null"
        )
      }),
      { firstRoomId: roomAId, secondRoomId: roomBId }
    );

    expect(storedState.globalUsername).toBe("Shared User");
    expect(storedState.roomA.Username).toBe("Room A Alias");
    expect(storedState.roomB.Username).toBe("Shared User");
  });

  test("leaving one room keeps the other tab joined and interactive", async ({
    context
  }) => {
    const { pageA, pageB, roomAId, roomBId, userId } =
      await setupSharedUserInTwoRooms(context);

    await pageA.getByRole("button", { name: "Account menu" }).click();
    await pageA.getByRole("menuitem", { name: "Leave Room" }).click();
    await expect(
      pageA.getByRole("heading", { name: "Leave room" })
    ).toBeVisible();
    await pageA.getByRole("button", { name: "Confirm leave room" }).click();
    await expect(pageA).toHaveURL("http://localhost:5173/");

    await expect(
      pageB.getByTestId("player").filter({ hasText: "Shared User" })
    ).toBeVisible();
    await pageB.getByRole("button", { name: "2", exact: true }).click();

    const membership = await graphql<{
      roomA: { users: { id: string }[] };
      roomB: {
        users: { id: string; lastCardPicked: string | null }[];
      };
    }>(
      pageB,
      `
        query MembershipIsolation($roomAId: UUID!, $roomBId: UUID!) {
          roomA: roomById(roomId: $roomAId) {
            users {
              id
            }
          }
          roomB: roomById(roomId: $roomBId) {
            users {
              id
              lastCardPicked
            }
          }
        }
      `,
      { roomAId, roomBId }
    );

    expect(membership.roomA.users.some((user) => user.id === userId)).toBe(
      false
    );
    expect(
      membership.roomB.users.find((user) => user.id === userId)
    ).toMatchObject({ lastCardPicked: "2" });

    const storedRooms = await pageB.evaluate(
      ({ firstRoomId, secondRoomId }) => ({
        roomA: localStorage.getItem(`Room:${firstRoomId}`),
        roomB: localStorage.getItem(`Room:${secondRoomId}`)
      }),
      { firstRoomId: roomAId, secondRoomId: roomBId }
    );
    expect(storedRooms.roomA).toBeNull();
    expect(storedRooms.roomB).not.toBeNull();
  });

  test("a kick from one room does not log the user out of another room", async ({
    context
  }) => {
    const { pageA, pageB, roomAId, roomBId, userId } =
      await setupSharedUserInTwoRooms(context);

    await graphql<{ kickUser: { id: string } }>(
      pageA,
      `
        mutation KickFromFirstRoom($roomId: UUID!, $userId: UUID!) {
          kickUser(roomId: $roomId, targetUserId: $userId) {
            id
          }
        }
      `,
      { roomId: roomAId, userId }
    );

    await expect(pageA).toHaveURL("http://localhost:5173/");
    await expect(pageB).toHaveURL(`http://localhost:5173/room/${roomBId}`);
    await expect(
      pageB.getByTestId("player").filter({ hasText: "Shared User" })
    ).toBeVisible();

    await pageB.getByRole("button", { name: "3", exact: true }).click();
    const roomBState = await graphql<{
      roomById: {
        users: { id: string; lastCardPicked: string | null }[];
      };
    }>(
      pageB,
      `
        query RoomAfterKick($roomId: UUID!) {
          roomById(roomId: $roomId) {
            users {
              id
              lastCardPicked
            }
          }
        }
      `,
      { roomId: roomBId }
    );

    expect(
      roomBState.roomById.users.find((user) => user.id === userId)
    ).toMatchObject({ lastCardPicked: "3" });
  });
});
