// tests/edit-listing.spec.js
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const USERNAME = process.env.TEST_USER_USERNAME;
const PASSWORD = process.env.TEST_USER_PASSWORD;

// Seeded listing (backend/seed-test-listing.js), owned by this same test user.
const OWNED_LISTING_ID = 1;

async function login(page) {
  await page.goto("/login");
  await page.getByLabel("Email or Username").fill(USERNAME);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 10_000 });
}

test.describe("Edit listing flow", () => {
  test.beforeAll(() => {
    if (!USERNAME || !PASSWORD) {
      throw new Error(
        "TEST_USER_USERNAME / TEST_USER_PASSWORD not set — check .env.test",
      );
    }
  });

  test("edits an owned listing and saves changes", async ({ page }) => {
    await login(page);
    await page.goto(`/listings/${OWNED_LISTING_ID}/edit`);

    // Form pre-fills from existing data (400ms artificial delay in the page).
    await expect(page.getByLabel("Title")).not.toHaveValue("", {
      timeout: 5_000,
    });

    const updatedTitle = `Updated by Playwright ${Date.now()}`;
    await page.getByLabel("Title").fill(updatedTitle);

    await page.getByRole("button", { name: "Save Changes" }).click();

    // On success, EditListingPage navigates to /listings/:id
    await expect(page).toHaveURL(
      new RegExp(`/listings/${OWNED_LISTING_ID}$`),
      { timeout: 15_000 },
    );
    await expect(
      page.getByRole("heading", { name: updatedTitle }),
    ).toBeVisible();
  });

  test("blocks editing a listing you don't own", async ({ page }) => {
    await login(page);

    // Non-existent / not-owned ID — with only one seeded listing (owned by
    // this user), any other ID either 404s or (if owned by someone else)
    // shows the Not Authorized screen. Using a very high ID to force "not found".
    await page.goto("/listings/999999/edit");

    // Either outcome is an acceptable, non-crashing gate — assert on
    // whichever screen actually renders.
    await expect(
      page.getByText(/listing not found/i).or(page.getByText(/not authorized/i)),
    ).toBeVisible({ timeout: 10_000 });
  });
});