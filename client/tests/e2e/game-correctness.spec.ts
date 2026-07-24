// Playwright end-to-end coverage.
import { test, expect, type Browser, type Page } from "@playwright/test";

import {
  createRoom,
  joinRoom,
  revealEstimations,
  startNewRound
} from "./helpers";

let pages: Page[] = [];

test.afterEach(async () => {
  await Promise.all(pages.map((page) => page.close()));
  pages = [];
});

/** First username is the host/room owner. */
async function setupRoom(
  browser: Browser,
  usernames: string[]
): Promise<Page[]> {
  const host = await browser.newPage();
  pages.push(host);
  const roomUrl = await createRoom(host);
  await joinRoom(host, usernames[0]);

  for (const username of usernames.slice(1)) {
    const guest = await browser.newPage();
    pages.push(guest);
    await joinRoom(guest, username, roomUrl);
  }

  for (const page of pages) {
    await expect(page.getByTestId("player")).toHaveCount(usernames.length);
  }
  return pages;
}

function vote(page: Page, card: string) {
  return page.getByRole("button", { name: card, exact: true }).click();
}

function tile(page: Page, username: string) {
  return page.getByTestId("player").filter({ hasText: username });
}

test("shows the correct idle visuals before anyone votes", async ({
  browser
}) => {
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await expect(host.getByText("No votes yet")).toBeVisible();
  await expect(host.getByText("Waiting for players to vote...")).toBeVisible();
  await expect(guest.getByText("Select a card to vote")).toBeVisible();
  await expect(
    host.getByRole("button", { name: "Reveal Votes" })
  ).not.toBeVisible();
});

test("a vote registers in every tab: counter, indicator, and waiting state", async ({
  browser
}) => {
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await vote(guest, "3");

  await expect(guest.getByText("Waiting to reveal cards...")).toBeVisible();
  await expect(host.getByText("1/2 voted (50%)")).toBeVisible();
  await expect(tile(host, "Bruno").getByAltText("Card picked")).toBeVisible();

  await vote(host, "5");
  await expect(host.getByText("2/2 voted (100%)")).toBeVisible();
  await expect(tile(guest, "Alice").getByAltText("Card picked")).toBeVisible();
});

test("clicking your card again clears the vote everywhere", async ({
  browser
}) => {
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await vote(guest, "3");
  await expect(tile(host, "Bruno").getByAltText("Card picked")).toBeVisible();

  await vote(guest, "3"); // deselect
  await expect(
    tile(host, "Bruno").getByAltText("Card picked")
  ).not.toBeVisible();
  await expect(host.getByText("No votes yet")).toBeVisible();
  await expect(guest.getByText("Select a card to vote")).toBeVisible();
});

test("reveal shows each player's value and computes the average correctly", async ({
  browser
}) => {
  const all = await setupRoom(browser, ["Alice", "Bruno", "Carol", "Denis"]);
  const [host] = all;
  const votes: Record<string, string> = {
    Alice: "1",
    Bruno: "2",
    Carol: "3",
    Denis: "5"
  };

  for (const [i, name] of Object.keys(votes).entries()) {
    await vote(all[i], votes[name]);
  }
  await expect(host.getByText("4/4 voted (100%)")).toBeVisible();
  await revealEstimations(host);

  // (1 + 2 + 3 + 5) / 4 = 2.75 → "2.8"; all votes differ → 25% consensus
  for (const page of all) {
    const chart = page.getByTestId("vote-distribution-chart");
    await expect(chart).toBeVisible();
    await expect(chart.getByText("AVERAGE")).toBeVisible();
    await expect(chart.getByText("2.8", { exact: true })).toBeVisible();
    await expect(chart.getByText("25%", { exact: true })).toBeVisible();
    await expect(chart.getByText("AGREE")).toBeVisible();
    await expect(chart.getByText("CONSENSUS LEVEL")).toBeVisible();
    await expect(chart.getByText("NEXT STEP")).toBeVisible();
    await expect(
      chart.getByText(
        "Wide spread (1-5) - compare and discuss the lowest [1] and highest [5] assumptions."
      )
    ).toBeVisible();
    for (const [name, value] of Object.entries(votes)) {
      // The SVG card exposes one combined accessible label even though its
      // visible estimate/count/label are separate text nodes.
      await expect(
        chart.getByRole("img", {
          name: `${value} story points: 1 vote`,
          exact: true
        })
      ).toBeVisible();
      await expect(
        tile(page, name).getByText(value, { exact: true })
      ).toBeVisible();
    }
  }
});

test("fractional estimates render as 0.5 in numeric order", async ({
  browser
}) => {
  const all = await setupRoom(browser, ["Alice", "Bruno", "Carol"]);
  const [host] = all;

  await vote(all[0], "0");
  await vote(all[1], "0.5");
  await vote(all[2], "1");
  await revealEstimations(host);

  const chart = host.getByTestId("vote-distribution-chart");
  await expect(
    chart.getByRole("img", {
      name: "0.5 story points: 1 vote",
      exact: true
    })
  ).toBeVisible();

  const cardLabels = await chart
    .locator('g[role="img"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label"))
    );
  expect(cardLabels).toEqual([
    "0 story points: 1 vote",
    "0.5 story points: 1 vote",
    "1 story points: 1 vote"
  ]);
});

test("non-numeric votes are excluded from the average but count for agreement", async ({
  browser
}) => {
  const all = await setupRoom(browser, ["Alice", "Bruno", "Carol"]);
  const [host, , carol] = all;

  await vote(all[0], "2");
  await vote(all[1], "2");
  await vote(all[2], "?");
  await revealEstimations(host);

  // average over numeric votes only: (2 + 2) / 2 = "2.0";
  // agreement: 2 of 3 picked "2" → 67%
  for (const page of all) {
    const chart = page.getByTestId("vote-distribution-chart");
    await expect(chart.getByText("2.0", { exact: true })).toBeVisible();
    await expect(chart.getByText("67%", { exact: true })).toBeVisible();
    await expect(chart.getByText("AGREE")).toBeVisible();
    await expect(chart.getByText("CONSENSUS LEVEL")).toBeVisible();
  }
  await expect(
    tile(host, "Carol").getByText("?", { exact: true })
  ).toBeVisible();
  await expect(
    tile(carol, "Alice").getByText("2", { exact: true })
  ).toBeVisible();
});

test("players who did not vote show no value after reveal", async ({
  browser
}) => {
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await vote(host, "5");
  await revealEstimations(host);

  await expect(tile(host, "Bruno").getByAltText("Game over")).toBeVisible();
  await expect(
    tile(guest, "Alice").getByText("5", { exact: true })
  ).toBeVisible();
  // only the single numeric vote counts
  const chart = host.getByTestId("vote-distribution-chart");
  await expect(chart.getByText("5.0", { exact: true })).toBeVisible();
  await expect(chart.getByText("100%", { exact: true })).toBeVisible();
  await expect(chart.getByText("AGREE")).toBeVisible();
  await expect(chart.getByText("CONSENSUS LEVEL")).toBeVisible();
});

test("starting a new round resets every tab to the voting stage", async ({
  browser
}) => {
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await vote(host, "3");
  await vote(guest, "5");
  await revealEstimations(host);
  await expect(guest.getByTestId("vote-distribution-chart")).toBeVisible();

  await startNewRound(host);

  for (const page of [host, guest]) {
    await expect(page.getByTestId("vote-distribution-chart")).not.toBeVisible();
  }
  await expect(host.getByText("No votes yet")).toBeVisible();
  await expect(guest.getByText("Select a card to vote")).toBeVisible();
  await expect(
    tile(host, "Bruno").getByAltText("Card picked")
  ).not.toBeVisible();
});

test("countdown reveal counts down, then reveals in every tab", async ({
  browser
}) => {
  // the countdown overlay only lives ~3s, so give this test headroom when the
  // suite runs fully parallel and workers get starved
  test.setTimeout(60_000);
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await host.getByRole("button", { name: "Account menu" }).click();
  await host.getByRole("menuitem", { name: "Change Room Options" }).click();
  await host.locator("#countdown-enabled").click();
  // exact match: the toast also mounts a transient "Notification Countdown
  // enabled" screen-reader live region that would trip strict mode
  await expect(
    host.getByText("Countdown enabled", { exact: true })
  ).toBeVisible();
  await host.getByRole("button", { name: "Save & close" }).click();

  await vote(guest, "3");

  // watch for the transient overlay in the guest tab BEFORE triggering the
  // reveal, so a starved worker can't miss the 3-second window
  const overlaySeen = guest
    .getByText("Revealing cards in...")
    .waitFor({ state: "visible", timeout: 15_000 });
  await revealEstimations(host);
  await overlaySeen;

  for (const page of [host, guest]) {
    await expect(page.getByTestId("vote-distribution-chart")).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText("3.0", { exact: true })).toBeVisible();
  }
});

test("the room owner can kick a player from the context menu", async ({
  browser
}) => {
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await tile(host, "Bruno").click({ button: "right" });
  await host.getByRole("button", { name: "Kick user" }).click();

  await expect(host.getByTestId("player")).toHaveCount(1);
  await expect(guest.getByPlaceholder("Enter username")).toBeVisible();
});

test("a chat message sent from one tab appears in the others", async ({
  browser
}) => {
  const [host, guest] = await setupRoom(browser, ["Alice", "Bruno"]);

  await tile(guest, "Bruno").click();
  const editor = guest.getByLabel("Type message");
  await expect(editor).toBeVisible();
  await editor.fill("hello from Bruno");
  await guest.getByTitle("Send").click();

  await expect(host.getByText("hello from Bruno").first()).toBeVisible();
});
