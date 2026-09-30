// src/middleware/rateLimit.js — centralized rate limiters (ponytail: one file, reuse)
const rateLimit = require("express-rate-limit");

// Escape hatch for the Playwright suite. Several limiters (otpLimiter above all)
// are keyed by IP with a long window and a small budget, and the suite reuses
// the long-running dev server, so one window is shared across every test run —
// an API test that legitimately calls an OTP route burns budget the next run
// needs. Playwright sets DISABLE_RATE_LIMIT=1 on the webServer (see
// playwright.config.js); CI does the same.
//
// Hard-guarded: never active when NODE_ENV=production, so a stray value in a
// committed .env cannot silently disable throttling in prod.
const rateLimitsDisabled = () =>
  process.env.DISABLE_RATE_LIMIT === "1" && process.env.NODE_ENV !== "production";

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again in a minute" },
  skip: rateLimitsDisabled,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP attempts, please try again later" },
  skip: rateLimitsDisabled,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment attempts, please slow down" },
  skip: rateLimitsDisabled,
});

const frederickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests, please try again shortly" },
  skip: rateLimitsDisabled,
});

const jegedeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many Jegede updates, please try again shortly" },
  skip: rateLimitsDisabled,
});

const gigTransferLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many transfer attempts, try again in 15 minutes" },
  skip: rateLimitsDisabled,
});

const gigResolveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many resolve attempts, slow down" },
  skip: rateLimitsDisabled,
});

module.exports = { authLimiter, otpLimiter, paymentLimiter, frederickLimiter, jegedeLimiter, gigTransferLimiter, gigResolveLimiter };
