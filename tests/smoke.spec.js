// tests/smoke.spec.js
import { test, expect } from "@playwright/test";

// Real IDs seeded in the DB for dynamic route testing.
const LISTING_ID = 1;
const USER_ID = 1;

// Public routes — should load directly, no auth required.
const PUBLIC_ROUTES = [
  "/",
  "/marketplace",
  `/listings/${LISTING_ID}`,
  "/login",
  "/register",
  `/profile/${USER_ID}`,
  "/forgot-password",
  "/about",
  "/faq",
  "/privacy",
  "/terms",
  "/features",
  "/coming-soon",
  "/messages",
  "/saved",
  "/notifications",
  "/my-listings",
];

// Unknown route — should hit the 404 handler, not crash.
const NOT_FOUND_ROUTE = "/this-route-does-not-exist";

test.describe("Smoke tests — public routes load without errors", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const response = await page.goto(route);

      expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(500);
      expect(pageErrors, `Uncaught page errors on ${route}`).toEqual([]);

      // Confirm React actually mounted something (not a blank white screen).
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }

  test(`unknown route ${NOT_FOUND_ROUTE} shows 404, doesn't crash`, async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(NOT_FOUND_ROUTE);

    await expect(page.getByText(/404/i)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

test.describe("Smoke tests — protected/admin routes redirect when logged out", () => {
  const GATED_ROUTES = [
    "/create-listing",
    `/listings/${LISTING_ID}/edit`,
    "/admin",
    "/admin/listings",
    "/admin/users",
    "/admin/reports",
  ];

  for (const route of GATED_ROUTES) {
    test(`${route} redirects to /login when logged out`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    });
  }
});