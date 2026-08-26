// tests/login.spec.js
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const USERNAME = process.env.TEST_USER_USERNAME;
const PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe("Login flow", () => {
  test.beforeAll(() => {
    if (!USERNAME || !PASSWORD) {
      throw new Error(
        "TEST_USER_USERNAME / TEST_USER_PASSWORD not set — check .env.test",
      );
    }
  });

  test("logs in successfully with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email or Username").fill(USERNAME);
    await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log In" }).click();

    // On success, LoginPage navigates away from /login
    // (to redirectTo, or /verify-email if not yet verified)
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 10_000 });
  });

  test("shows an error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email or Username").fill(USERNAME);
    await page.getByRole("textbox", { name: "Password" }).fill("wrong-password-123");
    await page.getByRole("button", { name: "Log In" }).click();

    // Stays on /login and surfaces a server error via the Alert component
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByText(/invalid username\/email or password/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});