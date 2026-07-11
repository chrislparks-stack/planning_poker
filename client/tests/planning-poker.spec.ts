import { test, type Page } from "@playwright/test";

import {
  createRoom,
  joinRoom,
  makeEstimations,
  revealEstimations,
  startNewRound,
  verifyAllUsersPresent,
  verifyNewRound,
  verifyResults
} from "./helpers";

test.describe("Planning Poker Estimation", () => {
  let pages: Page[];

  test.beforeAll(async ({ browser }) => {
    pages = await Promise.all(
      Array(4)
        .fill(null)
        .map(() => browser.newPage())
    );
  });

  test.afterAll(async () => {
    await Promise.all(pages.map((page) => page.close()));
  });

  test("should allow multiple users to join a room and estimate a task", async () => {
    const [hostPage, ...guestPages] = pages;
    const roomUrl = await createRoom(hostPage);
    await joinRoom(hostPage, "User 1");

    for (const [index, page] of guestPages.entries()) {
      await joinRoom(page, `User ${index + 2}`, roomUrl);
    }

    await verifyAllUsersPresent(pages);
    await makeEstimations(pages);
    await revealEstimations(hostPage);
    await verifyResults(pages);
    await startNewRound(hostPage);
    await verifyNewRound(pages);
  });
});
