# Fresher 3-Month Selling Window

Label: `wayfinder:build`
Parent: `wayfinder/fresher-seller-map.md`
Blocked by: Fresher Seller Data Model
Blocks: —
Status: RESOLVED — ready to build

## Question
How long can a fresher sell without matric, and what happens after?

## Resolution
- At fresher signup (`isFresher=true`), set `fresherExpiresAt = now + 3 months`.
- Fresher can sell normally (listings, tasks, services) while `now < fresherExpiresAt` — same as any seller.
- After expiry, block seller actions: `POST /listings`, `POST /gigs`, `POST /services` return 403 `Fresher selling period ended — add your matric number and school email to continue`.
- Profile shows persistent banner with countdown: “You have X days left to add your matric number” (not dismissible).
- Email reminder at 2 weeks before expiry via Brevo (reuse marketing email infra).
- When `PATCH /api/users/me/matric` succeeds, clear `fresherExpiresAt` (set null) and set `isFresher=false`.
- Non-fresher sellers and freshers who already upgraded are unaffected (`fresherExpiresAt` null).

Verification:
- Fresher at day 10 can still create listing → 201
- Fresher at day 91 (3 months +1 day) tries `POST /listings` → 403 with message above until matric added
- Fresher adds matric at day 60 → `fresherExpiresAt` cleared, can sell forever

Assets: none
