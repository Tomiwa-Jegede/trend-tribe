// tests/matric-gate.spec.js — seller with no matric number gets an inline
// add-matric fallback instead of a dead-end bounce to the profile page.
import { test, expect } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(path.join(__dirname, "..", "backend", "package.json"));
// Backend JWT secret — mint tokens directly so these tests never trip the
// /auth/login rate limiter (10/min) the rest of the suite shares.
dotenv.config({ path: path.join(__dirname, "..", "backend", ".env") });
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const EMAIL = "matricgate.test@run.edu.ng";
const FRESHER_EMAIL = "fresher.gate.test@run.edu.ng";
const PASSWORD = "T 23 65 89a@";
const API = "http://localhost:5050/api";

const MATRIC_FIELD = 'input[placeholder="Matric number e.g. RUN/CMP/24/17209"]';

test.beforeAll(async () => {
  const password = await bcrypt.hash(PASSWORD, 12);
  const base = {
    password,
    fullName: "Matric Gate Test",
    school: "Redeemer's University",
    role: "SELLER",
    isVerified: true,
    matricNumber: null,
    tokenBalance: 10,
    fresherExpiresAt: new Date(Date.now() + 30 * 86400000),
  };
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: { ...base, isFresher: false },
    create: { ...base, slug: "matricgate-test", username: "matricgate_test", email: EMAIL, isFresher: false },
  });
  await prisma.user.upsert({
    where: { email: FRESHER_EMAIL },
    update: { ...base, isFresher: true },
    create: {
      ...base,
      slug: "fresher-gate-test",
      username: "fresher_gate_test",
      email: FRESHER_EMAIL,
      isFresher: true,
      jambRegNumber: "202441390932IF",
      jambExamYear: 2024,
    },
  });
});

// The gate only exists while the account has no matric — reset before every test.
test.beforeEach(async () => {
  // pages fetch the profile/listing over the network; the suite runs these in
  // parallel with the rest, so the 5s default is not enough.
  expect.configure({ timeout: 15_000 });
  await prisma.user.update({ where: { email: EMAIL }, data: { matricNumber: null, isFresher: false } });
  await prisma.user.update({ where: { email: FRESHER_EMAIL }, data: { matricNumber: null, isFresher: true } });
});

test.afterAll(async () => {
  expect.configure({ timeout: 5_000 });
  await prisma.$disconnect();
});

test.describe("matric gate", () => {
  // one shared account per test file — reset between tests, so run in order
  test.describe.configure({ mode: "serial" });

  async function authAs(page, request, email) {
    const record = await prisma.user.findUnique({ where: { email } });
    expect(record).toBeTruthy();
    const token = jwt.sign(
      { id: record.id, email: record.email, username: record.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    const me = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBe(true);
    const { user } = await me.json();
    await page.addInitScript(
      ([t, u]) => {
        localStorage.setItem("tt_token", t);
        localStorage.setItem("tt_user", JSON.stringify(u));
      },
      [token, user],
    );
    return { token, user };
  }

  async function authAsSellerWithoutMatric(page, request) {
    const { token, user } = await authAs(page, request, EMAIL);
    expect(user.role).toBe("SELLER");
    expect(user.matricNumber).toBeFalsy();
    return token;
  }

  test("create-listing shows inline add-matric fallback for seller with no matric", async ({ page, request }) => {
    await authAsSellerWithoutMatric(page, request);

    await page.goto("/create-listing");

    await expect(page.getByText("Matric number required — add it now to post.")).toBeVisible();
    await expect(page.locator(MATRIC_FIELD)).toBeVisible();
    // RUN email is already verified -> matric only, no school email, no OTP
    await expect(page.locator('input[placeholder="you@run.edu.ng"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save matric" })).toBeVisible();
    await expect(page.getByText(/is already verified — matric only/)).toBeVisible();
    // still a link to profile, but the fallback is inline
    await expect(page.getByRole("link", { name: "Add it in profile →" })).toBeVisible();
  });

  test("gigs shows inline add-matric fallback and keeps Post Task disabled", async ({ page, request }) => {
    await authAsSellerWithoutMatric(page, request);

    await page.goto("/gigs");

    await expect(page.getByText("Matric number required — add it now to post.")).toBeVisible();
    await expect(page.locator(MATRIC_FIELD)).toBeVisible();
    await expect(page.getByRole("button", { name: "Post Task" })).toBeDisabled();
  });

  test("adding a matric inline unblocks the create-listing form in place", async ({ page, request }) => {
    const token = await authAsSellerWithoutMatric(page, request);
    const matric = `RUN/CMP/24/${Math.floor(Math.random() * 90000) + 10000}`;

    await page.goto("/create-listing");
    await page.locator(MATRIC_FIELD).fill(matric);
    await page.getByRole("button", { name: "Save matric" }).click();

    await expect(page.getByRole("heading", { name: "Create a Listing" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(MATRIC_FIELD)).toHaveCount(0);

    // backend now lets this seller through the gate
    const res = await request.post(`${API}/listings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "Gate probe",
        description: "checking the matric gate is lifted",
        price: 100,
        category: "OTHERS",
        condition: "GOOD",
      },
    });
    expect(res.status()).toBe(201);
    const { listing } = await res.json();
    await request.delete(`${API}/listings/${listing.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("backend still hard-gates a seller with no matric", async ({ page, request }) => {
    const { token } = await authAs(page, request, EMAIL);
    const res = await request.post(`${API}/listings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "Should be blocked",
        description: "no matric set on this account",
        price: 100,
        category: "OTHERS",
        condition: "GOOD",
      },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe("MATRIC_REQUIRED");
  });

  // ── Profile page reuses the same fallback (no more dead-end prompt) ─────────

  test("own profile shows the inline add-matric fallback for a legacy seller", async ({ page, request }) => {
    await authAsSellerWithoutMatric(page, request);

    await page.goto("/profile/matricgate-test");

    await expect(page.getByText("Matric number required — add it now to post.")).toBeVisible();
    await expect(page.locator(MATRIC_FIELD)).toBeVisible();
    await expect(page.getByRole("button", { name: "Save matric" })).toBeVisible();
  });

  test("fresher profile asks for matric + school email (fresher exception)", async ({ page, request }) => {
    await authAs(page, request, FRESHER_EMAIL);

    await page.goto("/profile/fresher-gate-test");

    await expect(page.getByText(/selling as a fresher with JAMB/)).toBeVisible();
    await expect(page.locator(MATRIC_FIELD)).toBeVisible();
    await expect(page.locator('input[placeholder="you@run.edu.ng"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Send Code" })).toBeVisible();
  });
});
