# mkt-12-referral-incentive — CLOSED

## Question
What is the referral incentive tied to Showcase Pass: `referralCode:76` `ReferralCommission:481` rate, reward `Invite 3 course mates → 1 Showcase Pass free` vs `Both get 1 Pass`, and copy `Invite Your Course Mates` on `ReferralPage.jsx`?

## Type
wayfinder:grilling

## Notes
- HITL
- Call Skill tool twice: `grilling` + `domain-modeling`
- Reads: `frontend/src/pages/ReferralPage.jsx`, `backend/prisma/schema.prisma:76-82`, `wayfinder/referral-program-map.md`
- Blocked by: mkt-07-pricing-signal, mkt-08-pricing-bundle

## Blocking
- Blocks: none (terminal)


## Resolution
**Both get 1 Pass locked** — Both get 1 Showcase Pass via `referralCode:76` + `ReferralCommission:481`, copy `Invite Your Course Mates — you both get a Pass` on `ReferralPage.jsx`. Saved locally, not pushed.
