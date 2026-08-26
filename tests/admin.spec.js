// tests/admin.spec.js
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

test.describe("Admin dashboard", () => {
  test.beforeAll(() => {
    if (!USERNAME || !PASSWORD) {
      throw new Error(
        "TEST_USER_USERNAME / TEST_USER_PASSWORD not set — check .env.test",
      );
    }
  });

  test("admin can access dashboard and stats render", async ({ page }) => {
    await login(page);
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Stats fetch has a retry loop (up to 20 attempts, 3s apart) — give it
    // generous room, but a healthy backend should resolve on the first try.
    await expect(page.getByText("Total Users")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Total Listings")).toBeVisible();
    await expect(page.getByText("Active Listings")).toBeVisible();
    await expect(page.getByText("New Users (Last 7 Days)")).toBeVisible();
    await expect(page.getByText("New Listings (Last 7 Days)")).toBeVisible();

    // No error state should be showing.
    await expect(
      page.getByText("Failed to load dashboard stats."),
    ).not.toBeVisible();
  });
});