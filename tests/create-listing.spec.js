// tests/create-listing.spec.js
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const USERNAME = process.env.TEST_USER_USERNAME;
const PASSWORD = process.env.TEST_USER_PASSWORD;

async function login(page) {
  await page.goto("/login");
  await page.getByLabel("Email or Username").fill(USERNAME);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 10_000 });
}

test.describe("Create listing flow", () => {
  test.beforeAll(() => {
    if (!USERNAME || !PASSWORD) {
      throw new Error(
        "TEST_USER_USERNAME / TEST_USER_PASSWORD not set — check .env.test",
      );
    }
  });

  test("creates a listing with required fields only (no photos)", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/create-listing");

    const uniqueTitle = `Playwright Test Item ${Date.now()}`;

    await page.getByLabel("Title").fill(uniqueTitle);
    await page
      .getByLabel("Description")
      .fill("Created by an automated Playwright test. Safe to delete.");
    await page.getByLabel("Price (₦)").fill("2500");
    await page.locator("#category").selectOption("OTHERS");
    await page.locator("#condition").selectOption("GOOD");

    await page.getByRole("button", { name: "Post Listing" }).click();

    // On success, CreateListingPage navigates to /listings/:slug (or id)
    await expect(page).toHaveURL(/\/listings\/.+$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: uniqueTitle }),
    ).toBeVisible();
  });

  test("shows validation errors when required fields are missing", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/create-listing");

    await page.getByRole("button", { name: "Post Listing" }).click();

    await expect(page.getByText("Title is required")).toBeVisible();
    await expect(page.getByText("Description is required")).toBeVisible();
    await expect(page.getByText("Price is required")).toBeVisible();
    await expect(page.getByText("Please select a category")).toBeVisible();
    await expect(page.getByText("Please select a condition")).toBeVisible();

    // Should not have navigated away
    await expect(page).toHaveURL(/\/create-listing$/);
  });
});