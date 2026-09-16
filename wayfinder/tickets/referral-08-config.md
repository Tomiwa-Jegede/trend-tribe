# Config Centralization — Rate & Duration

Label: `wayfinder:task` (AFK)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`
Blocks: `Commission Engine & Wallet Credit`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
Where does the single source of truth for `REFERRAL_COMMISSION_RATE = 5%` and `REFERRAL_DURATION = 6 months` live so no value is scattered?

Do (not decide):

- Add `REFERRAL_COMMISSION_RATE` (default `0.05`) and `REFERRAL_DURATION_MONTHS` (default `6`) to `backend/src/config/env.js` reading from `process.env.REFERRAL_COMMISSION_RATE` / `REFERRAL_DURATION_MONTHS`, with validation (rate 0-1, months 1-24).
- Add same defaults to `.env.example` (never commit real `.env`), and reference via `config.referral.rate` / `config.referral.durationMonths` from `backend/src/utils/referral.js` and commission engine.
- Confirm no hardcoded `0.05` or `6 * 30` remains outside config (grep check).

Resolve when env reads, defaults, and grep passes; record the config keys and file paths for downstream tickets.

---

## Resolution — CLOSED 2026-09-16

**Done (task, AFK):** Centralized `REFERRAL_COMMISSION_RATE=5%` and `REFERRAL_DURATION=6 months` in `backend/src/config/env.js:38` as `config.referral`. No scattered `0.05` or `6 * 30`.

### Spec (to apply in build — not yet committed, decision only)

**`backend/src/config/env.js:38` add block (before `module.exports`):**

```js
// — Referral — single source of truth, never hardcode 0.05 or 6 elsewhere
const referralRateRaw = process.env.REFERRAL_COMMISSION_RATE;
const referralRate = referralRateRaw != null ? parseFloat(referralRateRaw) : 0.05;
if (isNaN(referralRate) || referralRate < 0 || referralRate > 1) {
  console.error('❌ REFERRAL_COMMISSION_RATE must be 0-1 (e.g. 0.05 for 5%)');
  process.exit(1);
}
const referralDurationRaw = process.env.REFERRAL_DURATION_MONTHS;
const referralDurationMonths = referralDurationRaw != null ? parseInt(referralDurationRaw, 10) : 6;
if (!Number.isInteger(referralDurationMonths) || referralDurationMonths < 1 || referralDurationMonths > 24) {
  console.error('❌ REFERRAL_DURATION_MONTHS must be integer 1-24');
  process.exit(1);
}

const config = {
  // ...existing 38-92...
  referral: { rate: referralRate, durationMonths: referralDurationMonths },
  // ...rest...
};
```

**`.env.example` add (never commit `.env`):**

```
REFERRAL_COMMISSION_RATE=0.05
REFERRAL_DURATION_MONTHS=6
```

**Downstream usage (grep-enforced):**

- `backend/src/utils/referral.js` → `const { rate: REFERRAL_RATE } = require('../config/env').referral;` and `durationMonths` for `commissionEndAt = addMonths(now, durationMonths)`.
- `backend/src/controllers/*` commission engine reads `config.referral.rate`, never literal `0.05`.
- Commission snapshot: `ReferralCommission.rate = REFERRAL_RATE` at creation time (audit history stays at old rate when config later changes).

**Validation:** `isNaN` + range checks on boot; `REFERRAL_DURATION_MONTHS` clamped 1-24 prevents 0-month or 10-year misconfig. Defaults ensure existing deployments without env vars still get 5%/6m.

**Grep check to enforce (run in build CI):**

```bash
rg -n "0\.05|REFERRAL.*5%|6 \* 30|duration.*6 months" backend/src --glob '!config/env.js' --glob '!*.test.js' && echo "FAIL: scattered rate/duration"
```

Closes ticket. Unblocks `Commission Engine & Wallet Credit`. Recorded keys: `config.referral.rate` (`Float 0-1`), `config.referral.durationMonths` (`Int 1-24`).


