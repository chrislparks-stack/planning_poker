// Playwright end-to-end coverage.
import { test, expect } from "@playwright/test";

test("home page has correct elements", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await expect(page.getByAltText("Summit")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "A Better Way to Estimate Together"
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start New Game" })
  ).toBeVisible();
});
