// Playwright end-to-end coverage.
import { test, expect, type Page } from "@playwright/test";

import { createRoom, joinRoom } from "./helpers";

test.describe("Room Account Menu Functionality", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await createRoom(page);
    await joinRoom(page, "TestUser");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("should open menu and display correct username and menu items", async () => {
    await expect(
      page.getByTestId("player").filter({ hasText: "TestUser" })
    ).toBeVisible();
    await openMenu(page);
    await verifyMenuItems(page);
  });

  test("should allow changing username", async () => {
    await openMenu(page);
    await changeUsername(page, "NewTestUser");
    await expect(
      page.getByTestId("player").filter({ hasText: "NewTestUser" })
    ).toBeVisible();
  });

  test("should allow leaving the current room", async () => {
    await openMenu(page);
    await leaveRoom(page);
    await verifyLeftRoom(page);
  });

  test("should allow rejoining a room after leaving", async () => {
    const roomUrl = page.url();
    await openMenu(page);
    await leaveRoom(page);
    await verifyLeftRoom(page);

    await page.goto(roomUrl);
    await expect(
      page.getByTestId("player").filter({ hasText: "TestUser" })
    ).toBeVisible();

    await openMenu(page);
    await verifyMenuItems(page);
  });
});

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
}

async function verifyMenuItems(page: Page) {
  await expect(
    page.getByRole("menuitem", { name: "Change Appearance" })
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Change Username" })
  ).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Support" })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Leave Room" })
  ).toBeVisible();
}

async function changeUsername(page: Page, newUsername: string) {
  await page.getByRole("menuitem", { name: "Change Username" }).click();
  await expect(
    page.getByRole("heading", { name: "Change username" })
  ).toBeVisible();
  await page.getByPlaceholder("Enter your new username").fill(newUsername);
  await page.getByRole("button", { name: "Save username" }).click();
  await expect(
    page.getByRole("heading", { name: "Change username" })
  ).not.toBeVisible();
}

async function leaveRoom(page: Page) {
  await page.getByRole("menuitem", { name: "Leave Room" }).click();
  await expect(page.getByRole("heading", { name: "Leave room" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm leave room" }).click();
}

async function verifyLeftRoom(page: Page) {
  await expect(page).toHaveURL("http://localhost:5173/");
}
