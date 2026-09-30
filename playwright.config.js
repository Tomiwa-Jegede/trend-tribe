// playwright.config.js
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command: "npm run dev",
      cwd: "./backend",
      url: "http://localhost:5050/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      // See backend/src/middleware/rateLimit.js — otpLimiter is 5 req/10 min
      // keyed by IP and shared across all six OTP routes, so a reused dev server
      // carries one window across every test run and any OTP-route test would
      // 429 the next run. The backend hard-refuses this when NODE_ENV=production.
      env: { DISABLE_RATE_LIMIT: "1" },
    },
    {
      command: "npm run dev",
      cwd: "./frontend",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});