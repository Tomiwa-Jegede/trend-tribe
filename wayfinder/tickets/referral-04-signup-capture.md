# Referral Signup Capture Flow

Label: `wayfinder:grilling` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`, `Referral Code Generation Strategy`, `Transaction Eligibility`
Blocks: `Commission Engine & Wallet Credit`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
Where and how is the referral relationship created during signup, from link click to locked `Referral` row, with all abuse guards?

Decide:

- Frontend capture: reading `?ref=CODE` in `frontend/src/pages/RegisterPage.jsx` / `VerifyOtpPage.jsx`, persisting through OTP (query param → localStorage/sessionStorage → hidden field on `POST /api/auth/register` and `POST /api/auth/verify-registration`), prefill UX and copy-on-success.
- Backend plumbing: accept `referralCode` in `register` (store on `PendingRegistration`) vs only on `verifyRegistration`; lookup `User` by `referralCode`, validate (not self, not invalid, not already referred), create `Referral` atomically with `prisma.user.create` in `backend/src/controllers/auth.controller.js:verifyRegistration` inside `$transaction`, with `referrerId ≠ referredId` and `@@unique([referredId])` guard.
- Immutability: referred user cannot change referrer after signup — enforce at DB (`Referral.referredId @unique`) and reject subsequent `?ref=` on login/profile; self-referral blocked by checking `pending.email` vs referrer user email.
- Commission window: `commissionStartAt = now`, `commissionEndAt = +6 months` computed once at creation, stored on `Referral`.
- Back-compat: existing users without codes get one on next read (lazy) or via migration.

Call `ui-ux-pro-max` for capture persistence pattern (referral param survival through OTP + redirect).

---

## Resolution — CLOSED 2026-09-16

**Decision:** Frontend captures `?ref=CODE` → `localStorage('tt_referral')` → hidden field on both `POST /register` and `POST /verify-registration`; backend stores raw code on `PendingRegistration.referralCode` at `register`, resolves and creates `Referral` atomically with `User` at `verifyRegistration` inside `$transaction`. Immutability via DB `referredId @unique`; window stored as `commissionEndAt = now + durationMonths`.

### Frontend capture (`frontend/src/pages/RegisterPage.jsx` + `VerifyOtpPage.jsx`)

```jsx
// on mount — RegisterPage + VerifyOtpPage
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || params.get('referral') || params.get('ref_code');
  if (ref) {
    const code = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
    if (code.length >= 4) {
      localStorage.setItem('tt_referral', code);
      // optional: show "Referred by @CODE — you'll be linked after signup" banner
    }
  }
  // if no query param, keep existing localStorage value (preserves through OTP redirect)
}, []);

// on submit — RegisterPage
const referralCode = localStorage.getItem('tt_referral');
await api.post('/auth/register', { email, username, password, fullName, school, matricNumber, whatsapp, bio, role, referralCode });

// VerifyOtpPage posts referralCode again (survives if user opened OTP email later)
const referralCode = localStorage.getItem('tt_referral');
await api.post('/auth/verify-registration', { email, otp, referralCode });
```

- **Persistence:** `localStorage` (not session) so code survives closing OTP email and returning. Cleared on `verify-registration` success (`removeItem('tt_referral')`). Also sync to `sessionStorage` as backup for private browsing.
- **Prefill UX:** If `tt_referral` present, Register form shows read-only "Referral code: ABC123 ✓" pill with `×` to clear. VerifyOtp also shows pill. No editable field to avoid gaming — link is source of truth.
- **Share link generation:** Dashboard copies `${config.clientUrl}/signup?ref=${user.referralCode}` (where `config.clientUrl` is `frontend/src/config/env.js` `VITE_API_URL` origin); Web Share API fallback to clipboard (see ticket 09).
- **`ui-ux-pro-max` guard:** No new visual system — Tailwind `bg-white border rounded-xl p-4` like `ProfilePage` cards, `Framer Motion` page transition already in `App.jsx:PageTransition`.

### Backend plumbing (`backend/src/controllers/auth.controller.js`)

**`register` (`auth.controller.js:51`) change — store code on `PendingRegistration`:**

```js
// inside register handler, after extracting body
const referralCodeRaw = req.body.referralCode;
const referralCode = referralCodeRaw ? normalizeReferralCode(referralCodeRaw) : null;
let referralUser = null;
if (referralCode) {
  referralUser = await prisma.user.findUnique({ where: { referralCode } });
  if (!referralUser) {
    // explicit field invalid → 400; silent query param case would be null, not here
    return res.status(400).json({ error: 'Invalid referral code' });
  }
  if (referralUser.email.toLowerCase() === email.toLowerCase()) {
    return res.status(400).json({ error: 'You cannot refer yourself' });
  }
}
// in upsert create/update data, add:
referralCode: referralCode // nullable on PendingRegistration — survives resendRegistrationOtp
```

Resend (`resendRegistrationOtp`) keeps existing `PendingRegistration.referralCode` (no overwrite, no loss).

**`verifyRegistration` (`auth.controller.js:192`) change — atomic `User` + `Referral` creation:**

```js
const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
// ...existing OTP checks...
const referralCodeRaw = req.body.referralCode || pending.referralCode;
const referrer = referralCodeRaw ? await prisma.user.findUnique({ where: { referralCode: normalizeReferralCode(referralCodeRaw) } }) : null;
if (referralCodeRaw && !referrer) {
  // if code came from pending (link flow) and is now invalid (referrer deleted) → silently drop, don't block signup
  // if code was explicit body param mismatch, we already 400'd at register; here pending path is lenient
}
if (referrer && referrer.email.toLowerCase() === pending.email.toLowerCase()) {
  return res.status(400).json({ error: 'You cannot refer yourself' });
}

const { referralDurationMonths } = require('../config/env').referral; // 6 from ticket 08
const generateReferralCode = require('../utils/referral').generateReferralCode;
const referralCodeForNewUser = await generateReferralCode();

const newUser = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { slug, email: pending.email, username: pending.username, password: pending.password, fullName: pending.fullName, school: pending.school, matricNumber: pending.matricNumber, whatsapp: normalizeWhatsapp(pending.whatsapp), bio: pending.bio, role: pending.role, isVerified: true, gigAccountNumber, referralCode: referralCodeForNewUser }
  });
  if (referrer) {
    // immutability: this is the ONLY place Referral is created; no update endpoint exists
    const commissionEndAt = new Date(); commissionEndAt.setMonth(commissionEndAt.getMonth() + referralDurationMonths);
    try {
      await tx.referral.create({
        data: { referrerId: referrer.id, referredId: user.id, referralCode: referrer.referralCode, commissionStartAt: new Date(), commissionEndAt, status: 'ACTIVE' }
      });
      // notify referrer (see ticket 10) — inside tx for audit, best-effort outside for push
    } catch (e) {
      if (e.code === 'P2002') { /* referredId already has referrer — should not happen, but don't fail user creation */ }
      else throw e;
    }
  }
  await tx.pendingRegistration.delete({ where: { email } });
  return user;
});
// after tx: emit notification/push to referrer if Referral was created; clear frontend localStorage via response hint
```

- **Atomicity:** `User.create` + `Referral.create` in same `$transaction` — no orphan user without referral linkage race.
- **Immutability:** `Referral.referredId @unique` DB constraint + **no** `PATCH /users/:id/referral` endpoint ever exists. Subsequent `?ref=` on login/profile is ignored (no FK to update). Admin cannot change via UI (read-only).
- **Window:** `commissionStartAt = now`, `commissionEndAt = addMonths(now, durationMonths)` stored once; per-referee independent (10 referrals → 10 rows with different `commissionEndAt`).
- **Back-compat:** Existing users missing `referralCode` get one via `generateReferralCode()` at creation; backfilled others via script/lazy (ticket 02).

### Abuse guards (reuse existing `rateLimit.js`)

- `register` and `verify-registration` already under `authLimiter`/`otpLimiter` (`auth.routes.js:register`) — referral lookup is indexed `findUnique` (cheap) and not a DDoS vector.
- Changing referrer after signup: **no endpoint** → 404; DB unique prevents second row even if attacker crafts manual `POST /api/referrals`.

Unblocks `Commission Engine`. Fog on disclosure timing stays Not yet specified only for expiry notifications.


