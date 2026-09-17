# Wayfinder Map — Fresher Seller (JAMB for Redeemers)

## Destination
Freshers (no matric yet, no school email) can register as sellers on Trend Tribe using personal email (like buyers) + JAMB year + JAMB reg number. The account is created as seller through the same OTP flow but with live JAMB matriculation check: only if `efacility.jamb.gov.ng/CheckMatriculationList` returns `Institution: Redeemers University` is the fresher allowed. Once fresher gets matric + school email, they add both from profile (one-way, keeps JAMB for audit).

## Notes
- Domain: Trend Tribe seller onboarding (Prisma/Postgres + Express + React/Tailwind), single-school (RUN, @run.edu.ng)
- Skills: product-brainstorming, ponytail (minimal delta)
- Stack: User {matricNumber String? @unique, isFresher Boolean, jambRegNumber String?, jambExamYear Int?, pendingSeller*}, PendingRegistration, auth.controller.js
- Preferences: reuse existing seller OTP trust, minimal schema delta, no parallel flow, fresher = buyer email until matric upgrade

## Decisions so far
- [Fresher Seller Data Model — Minimal Schema Delta](tickets/fresher-data-model.md): User `isFresher Boolean @default(false)`, `jambRegNumber String?`, `jambExamYear Int?`, `@@unique([jambRegNumber, jambExamYear])`, `fresherExpiresAt DateTime?` (+3 months from signup); PendingRegistration mirrors; matric stays nullable.
- [Registration Flow — Backend & Frontend (Fresher Path)](tickets/fresher-registration-flow.md): Both `POST /auth/register` and `upgrade-to-seller` branch on `isFresher`; fresher skips `@run.edu.ng` email check, uses buyer email; requires JAMB fields, format `^\d{8}[A-Z]{2}$`, year range, uniqueness, + live JAMB check (error if JAMB down: `Can't confirm Jamb Registration now try again later`).
- [Add Matric Number Later — Fresher-to-Verified-Seller Update](tickets/fresher-add-matric-later.md): `PATCH /api/users/me/matric` now takes `matricNumber + schoolEmail`, OTP to school email, flips `isFresher false`, clears `fresherExpiresAt`, keeps JAMB. Must be done within 3 months, else seller actions blocked.
- [JAMB Live Matriculation Check](tickets/fresher-jamb-live-check.md): Live POST to `efacility.jamb.gov.ng/CheckMatriculationList` with `__VIEWSTATE`, `ddlExamination` + `txtRegNumber`, scrape `Institution` — only Redeemers University passes. Tested 2024 `202441390932IF` ✅ and `202440567105CA` ✅, `202440567105CF` ❌. On JAMB down return 503 `Can't confirm Jamb Registration now try again later`.
- [Fresher 3-Month Selling Window](tickets/fresher-3month-window.md): Freshers can sell for 3 months from signup (`fresherExpiresAt`). After expiry, `POST /listings` and `POST /gigs` blocked until matric+school email added. Profile shows countdown, email reminder at 2 weeks left.

## Not yet specified
- Admin flag/filter for freshers-pending-matric + expiry view?
- Email reminder content/timing for 3-month expiry?

## Out of scope
- Multi-school support
- Changing matric flow for non-freshers
- JUPEB/other entry paths (only UTME JAMB for now)
