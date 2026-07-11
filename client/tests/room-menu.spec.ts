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

  test("should allow logging out", async () => {
    await openMenu(page);
    await logout(page);
    await verifyLoggedOut(page);
  });

  test("should allow joining room after logout", async () => {
    await openMenu(page);
    await logout(page);
    await verifyLoggedOut(page);

    const newUsername = "UserComeBack";
    await joinRoom(page, newUsername);

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
  await expect(page.getByRole("menuitem", { name: "Logout" })).toBeVisible();
}

async function changeUsername(page: Page, newUsername: string) {
  await page.getByRole("menuitem", { name: "Change Username" }).click();
  await expect(page.getByText("Update Your Username")).toBeVisible();
  await page.getByPlaceholder("Enter your new username").fill(newUsername);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Update Your Username")).not.toBeVisible();
}

async function logout(page: Page) {
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm sign out" }).click();
}

async function verifyLoggedOut(page: Page) {
  // logging out on a room page reopens the join dialog
  await expect(page.getByPlaceholder("Enter username")).toBeVisible();
}
