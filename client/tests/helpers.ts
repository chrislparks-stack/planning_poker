import { expect, type Page } from "@playwright/test";

export async function createRoom(page: Page): Promise<string> {
  await page.goto("http://localhost:5173");
  await page.getByRole("button", { name: "Start New Game" }).click();
  await expect(page.getByPlaceholder("Enter username")).toBeVisible();
  return page.url();
}

export async function joinRoom(page: Page, username: string, url?: string) {
  if (url) {
    await page.goto(url);
  }
  await page.getByPlaceholder("Enter username").fill(username);
  // "Create Room" for the first user in a room, "Join Room" for everyone else
  await page.getByRole("button", { name: /^(Create Room|Join Room)$/ }).click();
  await expect(
    page.getByTestId("player").filter({ hasText: username })
  ).toBeVisible();
}

export async function verifyAllUsersPresent(pages: Page[]) {
  for (const page of pages) {
    await expect(page.getByTestId("player")).toHaveCount(pages.length);
  }
}

export async function makeEstimations(pages: Page[]) {
  // subset of the default deck (0, 0.5, 1, 2, 3, 5, 8, 13, 21, ?, ☕)
  const estimations = ["1", "2", "3", "5", "8", "13", "21"];
  await Promise.all(
    pages.map((page, index) =>
      page
        .getByRole("button", {
          name: estimations[index % estimations.length],
          exact: true
        })
        .click()
    )
  );
}

export async function revealEstimations(hostPage: Page) {
  await hostPage.getByRole("button", { name: "Reveal Votes" }).click();
}

export async function verifyResults(pages: Page[]) {
  await Promise.all(
    pages.map(async (page) => {
      await expect(page.getByTestId("vote-distribution-chart")).toBeVisible();
    })
  );
}

export async function startNewRound(hostPage: Page) {
  await hostPage.getByRole("button", { name: "Start New Game" }).click();
  await expect(hostPage.getByText("Start a new game?")).toBeVisible();
  await hostPage
    .getByRole("button", { name: "Start new game", exact: true })
    .click();
}

export async function verifyNewRound(pages: Page[]) {
  await Promise.all(
    pages.map(async (page) => {
      await expect(
        page.getByTestId("vote-distribution-chart")
      ).not.toBeVisible();
    })
  );
}
