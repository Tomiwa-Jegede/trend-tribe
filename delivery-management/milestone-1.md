# Milestone 1: Auth & Trust Foundation

## Goal

Verified students can register, verify via OTP, authenticate, and manage their profile on Trend Tribe with JWT-secured access.

## Scope

- Email + username + password registration with Brevo OTP (`PendingRegistration` flow, `otpCode`/`otpExpiresAt`, 10-min cleanup)
- OTP verification (`/verify-registration`, `/verify-email`), login with JWT + `bcryptjs`, auth middleware (`Authorization: Bearer <token>`)
- Forgot password / reset password (`resetToken`/`resetTokenExpiresAt`) via Brevo, unsubscribe via `unsubscribeToken`
- Profile read/update: `fullName`, `school`, `bio`, `matricNumber`, `whatsapp` (E.164 via `libphonenumber-js`), `avatar`/`avatarPublicId` via Cloudinary
- Roles `USER`/`ADMIN`/`BUYER`/`SELLER`, route guards `ProtectedRoute` + `AdminRoute`, admin user management
- Token economy seed: `tokenBalance` (default 20), `aiUsesRemaining`, `numberViewsRemaining`, `TokenPurchase` relation
- Validation on every controller via `express-validator`; Helmet/CORS/Morgan hardening; health check `GET /api/health`

## Non-Goals

State what this milestone deliberately does not do.

- Listings CRUD or marketplace browsing (Milestone 2)
- Favorites, reports, or admin moderation surfaces (Milestone 3)
- Flutterwave token purchase or webhook handling (Milestone 4)
- In-app messaging, notifications, or native mobile apps

## Ownership Boundaries

- `backend/src/routes/auth.routes.js` + `backend/src/controllers/auth.controller.js` + `backend/src/validators/` — owns registration/OTP/login/reset/JWT issuance
- `backend/src/middleware/auth.js` — owns JWT verification and role checks
- `backend/prisma/schema.prisma` (models `User`, `PendingRegistration`) — owns auth data shape and indexes
- `frontend/src/pages/RegisterPage.jsx` / `VerifyOtpPage.jsx` / `LoginPage.jsx` / `ForgotPasswordPage.jsx` / `ResetPasswordPage.jsx` / `ProfilePage.jsx` / `EditProfilePage.jsx` + `frontend/src/context/AuthContext.jsx` — owns auth/profile UX and token storage/axios interceptor

## Execution Order

Sequence by dependency.

1. Prisma schema for `User` + `PendingRegistration` (fields `otpCode`, `resetToken`, `role`, `unsubscribeToken`, `tokenBalance`) -> `npx prisma migrate dev` + `prisma generate`
2. Backend config (`src/config/env.js`, `src/db.js`) + auth validators (`express-validator`) + Brevo OTP sender
3. Auth controllers/routes (register -> pending OTP -> verify -> login -> JWT issue -> forgot/reset) with `bcryptjs` hashing and cleanup interval
4. Auth middleware (JWT verify, `ADMIN` guard) + `GET /api/health` DB probe
5. Frontend `AuthContext` + axios interceptor + `ProtectedRoute`/`AdminRoute` + pages (Register/Verify/Login/Forgot/Reset/Profile/EditProfile)
6. Playwright coverage (`tests/login.spec.js`, `tests/smoke.spec.js`) + manual JWT/profile flow verification

## Value Outcome

Delivers `product-management/value-map.md` outcome V1 — Student (new/returning): register, verify identity via OTP, log in securely, and manage a trusted profile. Delivery status is not a claim of visible value; the milestone is done only when the stakeholder can feel this outcome.

## Status

Complete

- Current status summary: Delivered — registration/OTP/verify/login/JWT/forgot/reset/profile flows live; `GET /api/health` returns `Connected`; Playwright smoke + login specs pass with `reuseExistingServer`
- Remaining work: minor — rate-limit OTP resends, tighten `whatsapp` format messaging, expand e2e for reset-token expiry edge case

## Verification / Definition of Done

- `GET /api/health` returns 200 with `database: Connected` using live `DATABASE_URL`
- Playwright `tests/smoke.spec.js` + `tests/login.spec.js` pass locally (`npm test`) and in CI with `DOTENV .env.test`
- Manual: register -> receive Brevo OTP -> verify -> login -> receive JWT -> access `GET /api/auth/me` with `Authorization` header -> edit profile -> persist in DB
- Manual: forgot-password -> reset-token -> set new password -> login with new password succeeds, old password fails
- No unresolved `express-validator` gaps on `/api/auth/*`; expired `PendingRegistration` rows cleaned within 10 minutes

## Regression Guardrails

- Do not weaken OTP expiry or remove the 10-minute `PendingRegistration` cleanup interval
- Keep `express.json()` parsing after the raw webhook route — auth routes must continue to use JSON body validation
- Preserve JWT secret handling (`JWT_SECRET` in `.env`, never committed); token expiry and `isVerified` checks remain enforced
- Keep `libphonenumber-js` whatsapp validation in both backend validator and frontend form — do not accept unvalidated E.164 input
