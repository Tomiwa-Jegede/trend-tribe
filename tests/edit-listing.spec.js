// tests/edit-listing.spec.js
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

async function getOwnedListingId(page) {
  // Fetch owned listing via API (works with any seed id, not hardcoded 1)
  const token = await page.evaluate(() => localStorage.getItem("tt_token"));
  const res = await page.request.get("http://localhost:5050/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const me = await res.json();
  const userId = me.user?.id;
  const listRes = await page.request.get(`http://localhost:5050/api/listings/user/${userId}?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await listRes.json();
  const listing = data.listings?.[0] || data[0];
  if (!listing) throw new Error("No owned listing found for edit test — ensure seed exists");
  return listing.id || listing.slug;
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
    const ownedId = await getOwnedListingId(page);
    await page.goto(`/listings/${ownedId}/edit`);

    // Form pre-fills from existing data (400ms artificial delay in the page).
    await expect(page.getByLabel("Title")).not.toHaveValue("", {
      timeout: 5_000,
    });

    const updatedTitle = `Updated by Playwright ${Date.now()}`;
    await page.getByLabel("Title").fill(updatedTitle);

    await page.getByRole("button", { name: "Save Changes" }).click();

    // On success, EditListingPage navigates to /listings/:slug (slug may change on title update)
    await expect(page).toHaveURL(/\/listings\/.+$/, { timeout: 15_000 });
    await expect(page.getByText(updatedTitle).first()).toBeVisible({ timeout: 10_000 });
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