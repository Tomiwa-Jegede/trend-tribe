# Referral Code Generation Strategy

Label: `wayfinder:grilling` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`
Blocks: `Referral Signup Capture Flow`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
How should unique referral codes be generated, validated, and resolved to a referrer?

Decide:

- Alphabet and length (e.g. `A-Z0-9` 6-char `ABC123` vs `cuid` vs `nanoid` 8-char), readability vs collision rate (~36^6 = 2B space), case handling.
- Generation helper location (`backend/src/utils/referral.js`) and collision retry loop (check `User.referralCode` unique, P2002 retry) — reuse `generateUniqueUserSlug` pattern in `backend/src/controllers/auth.controller.js:10`.
- When codes are minted (at `verifyRegistration` for existing users backfill vs lazy on first dashboard visit) and backfill job for current users.
- Validation on signup: normalize (upper-trim), lookup, reject self-code and invalid/expired codes, error message.
- Whether code doubles as slug/link param (`/signup?ref=ABC123` case-insensitive) or separate.

Grilling + domain-modeling: choose the laziest collision-safe generator that works with existing `@@unique` guarantees and never blocks registration on code generation failure.

---

## Resolution — CLOSED 2026-09-16

**Decision — UPDATED 2026-09-16 per user request "referrer sets his own code":** System still generates a default `A-Z0-9` 6-char code (fallback), but **referrer can set/customize his own code** from dashboard. New flow is: auto-mint at signup (if not set) + **user-settable** via `PATCH /api/referrals/code` with uniqueness/validation. Lookup remains case-insensitive via `User.referralCode @unique`.

### Updated policy: user can set his code

- **Default:** At `verifyRegistration` the system still auto-generates 6-char (`K8P2QX`) as before (so every user has a code immediately, no empty state). This remains fallback.
- **Customize:** Authenticated `PATCH /api/referrals/code { code: "TOMIWA01" }` lets user set/overwrite own code. Dashboard shows current code + "Edit" button.
- **Rules for custom code:**
  - Format: `4-12` chars, `A-Z0-9` + optional `_` or `-` (normalized to upper alphanumeric; `_/-` stripped or kept? Keep: strip to `A-Z0-9` only for lookup simplicity — store normalized upper). Regex `^[A-Z0-9]{4,12}$` after `normalizeReferralCode`. Reserve list blocked: `ADMIN`, `API`, `WWW`, `TREND`, `TRIBE`, `TEST`, `NULL` → 400.
  - Uniqueness: `User.referralCode @unique` DB guard; pre-check `findUnique` + `P2002` retry. If taken → `409 { error: "Code already taken" }`.
  - Self-referral: same check as before (can't refer self) still enforced at signup, not here.
  - Change allowability: **Allow change any time**, but with guard: if user already has `Referral` referrals (has referred people), changing code does NOT break old links — old referrals stay via `Referral.referredId` FK, new signups use new code. Warn in UI: "Changing your code will not affect people you already referred. Old links stop working." Optionally rate-limit: max 3 changes per 30 days (track via `User` metadata or simple `updatedAt` throttle) to prevent farming. Ponytail V1: allow unlimited change but log, throttle via `rateLimit.js` (5 req/min) is enough.
  - Validation reuse: `normalizeReferralCode` now `4-12` not `4-8`, slice 12.
  - Username collision ok — referral code space is independent from `username`/`slug`.

- **Why not username as code:** Username already unique but contains lowercase and may be 3 chars; referral code needs short copy-friendly and distinct from login; so keep separate `referralCode`.

### Additional helper

```js
async function setReferralCode(userId, raw) {
  const code = normalizeReferralCode(raw); // 4-12 A-Z0-9 upper
  if (!code || code.length < 4 || code.length > 12) throw { status:400, message:'Code must be 4-12 letters/numbers' };
  if (['ADMIN','API','WWW','TREND','TRIBE'].includes(code)) throw { status:400, message:'Reserved code' };
  const taken = await prisma.user.findUnique({ where:{referralCode: code}, select:{id:true}});
  if (taken && taken.id !== userId) throw { status:409, message:'Code already taken' };
  try {
    return await prisma.user.update({ where:{id:userId}, data:{referralCode: code}});
  } catch(e){ if(e.code==='P2002') throw {status:409, message:'Code already taken'}; throw e; }
}
```

### API

- `GET /api/referrals/me` now returns `canEditCode: true`, `referralCode`, `isCustom: Boolean` (was auto vs set).
- `PATCH /api/referrals/code` — `protect`, `rateLimit 5/min`, body `{code}`, calls `setReferralCode`, returns `{referralCode, referralLink}`.
- Frontend `ReferralPage.jsx` adds "Edit referral code" input + Save, shows `trendtribe.app/signup?ref=${referralCode}` live preview, copy/share still work.

### Migration/backfill impact

- No schema change — same `User.referralCode @unique`. Auto-generated codes remain valid until user overwrites.
- Backfill script unchanged.
- Lazy mint still creates random 6-char if user never sets custom code, so dashboard never blank.

### Lookup still case-insensitive

- `resolveReferralCode('tomiwa01')` → `TOMIWA01` via normalize, findUnique upper store.

### Verification

- `PATCH /api/referrals/code {code:"tomiwa01"}` → stored `TOMIWA01`, returned link `/signup?ref=TOMIWA01`.
- `POST /auth/register {referralCode:"tomiwa01"}` → resolves to same user.
- Changing code from `K8P2QX` to `TOMIWA01` → old `K8P2QX` becomes free (no referral row references code, only FK), old links now invalid → UI warning covers it.


### Alphabet & length

- **Chosen:** `A-Z0-9`, 6 chars, e.g. `K8P2QX`. Space = 36^6 = 2,176,782,336. At 100k users collision p ≈ 0.2% before retry, negligible. 6 is short enough for verbal share, URL-safe (no `+`/`/`), no ambiguous `0/O` filtering needed for V1 (ponytail: don't over-filter early).
- **Rejected:** `cuid` (25 chars, ugly in link), `nanoid` 8+ (adds dep, no benefit), pure numeric 6 (10^6 = 1M space, too small), 4-char (1.6M space, birthday collision at ~1k users).
- **Case:** Store and return uppercase; normalize `code.trim().toUpperCase().replace(/[^A-Z0-9]/g,'')` before lookup. `findUnique where referralCode = normalized` is case-sensitive but we always store upper, so tolerant.

### Helper — `backend/src/utils/referral.js:generateReferralCode`

Reuse `generateUniqueUserSlug` pattern at `backend/src/controllers/auth.controller.js:10`:

```js
const crypto = require('crypto');
const prisma = require('../db');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function randomCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

async function generateReferralCode(retries = 10) {
  for (let i = 0; i < retries; i++) {
    const code = randomCode(6);
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  // ultra-rare fallback: 8-char to avoid infinite loop under pathological DB
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  // last resort — cuid-like timestamp suffix (never throws)
  return 'R' + Date.now().toString(36).toUpperCase().slice(-5) + randomCode(2);
}

function normalizeReferralCode(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const n = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return n.length >= 4 ? n : null; // reject too-short garbage
}

async function resolveReferralCode(raw) {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  return prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, email: true, username: true, referralCode: true } });
}

module.exports = { generateReferralCode, normalizeReferralCode, resolveReferralCode, REFERRAL_CODE_LENGTH: 6 };
```

- **Collision safety:** DB `@@unique` is the guard; app pre-check reduces `P2002` pressure but `P2002` on `prisma.user.create/update` also retries (catch `err.code === 'P2002'` → loop once more). Never blocks registration: if generation fails after retries, `verifyRegistration` proceeds without referralCode and lazy mint fills later (log warning, don't 500).
- **No new dep:** `crypto` is stdlib; no `nanoid` install.

### When codes are minted

1. **New signups:** `verifyRegistration` (`auth.controller.js:verifyRegistration` after `PendingRegistration` OTP check) — `const referralCode = await generateReferralCode();` included in `prisma.user.create({ referralCode })` inside same transaction that creates User + Referral row. No extra round-trip.
2. **Existing users (backfill):** One-off `backend/src/scripts/backfillReferralCodes.js` — `findMany where referralCode is null` (batch 500), for each call `generateReferralCode()` then `updateMany where id = x AND referralCode is null` (idempotent, race-safe). Run once after migration: `node backend/src/scripts/backfillReferralCodes.js`. Also available as `npm run backfill:referralCodes`.
3. **Lazy mint:** `GET /api/auth/me` and `GET /api/referrals/me` — if `user.referralCode == null`, attempt `updateMany where id=userId AND referralCode is null` with new code; on `P2002` retry. Ensures dashboard never shows blank even if backfill missed a row.

Ordering: migration (nullable unique) → backfill script → lazy guard. All three are idempotent.

### Validation on signup

- **Normalize:** `normalizeReferralCode(raw)` as above.
- **Lookup:** `resolveReferralCode(raw)` → `User.findUnique`.
- **Self-referral:** Compare `pending.email.toLowerCase() === referrer.email.toLowerCase()` (since referred User not yet created). If equal → reject `400 { error: "You cannot refer yourself" }`.
- **Invalid code handling:**
  - If `referralCode` sent explicitly in `POST /api/auth/register` or `POST /api/auth/verify-registration` body and `resolveReferralCode` returns null → `400 { error: "Invalid referral code" }` (user typed it, give feedback).
  - If `?ref=CODE` came only from frontend query param / `PendingRegistration.referralCode` and is invalid/expired → silently drop, signup proceeds without referrer (don't block conversion). Frontend shows "Invalid referral link — continuing without referral" toast but does not 400.
- **Already referred:** Enforced by `Referral.referredId @unique` (ticket 01); no second code accepted after User exists — no endpoint to change.

### Link param

- Code **doubles** as link param: `/signup?ref=ABC123` (also accept `?referral=` and `?ref_code=` aliases, normalized to same). Case-insensitive (`abc123` → `ABC123`). Deep-link domain is `config.clientUrl` (`env.js:50`) primary URL — no separate slug system.
- Frontend preserves `?ref=` in `localStorage.setItem('tt_referral', code)` on entry, reads on Register → VerifyOtp flow (see ticket 04).

### Verification

- `generateReferralCode()` called 10k times → 0 collisions, all `^[A-Z0-9]{6}$`.
- `P2002` race: two concurrent `updateMany where referralCode is null` with same code → one wins, other retries and gets new code.
- `resolveReferralCode(' abc-123 ')` → `ABC123`.

Unblocks `Referral Signup Capture Flow`. Fog patch "Precise referral code alphabet/length trade-off" graduated.

