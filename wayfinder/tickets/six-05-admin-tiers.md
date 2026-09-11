---
label: wayfinder:grilling
status: closed
---
## Question
Two admin tiers: Top `Jegede01` (hardcode username) full access vs Basic `ADMIN` blocked on *all money* (`PlatformProfit`/`gigWithdrawals`/`Fees`/`TokenPurchase`/`Available Balance`/wallet) — should `Role` stay `ADMIN` with runtime check vs new `BASIC_ADMIN`, and should enforcement be middleware 403 + UI hide Treasury?

## Resolution
Keep `Role.ADMIN`, runtime `isTopAdmin = user.username === "Jegede01"` (hardcode as clarified). Middleware `requireTopAdmin` on Treasury routes (`/api/admin/withdrawals`, `PlatformProfit`, `Fees`, `TokenPurchase`, wallet) returns 403 for Basic; UI `AdminRoute` hides Treasury nav + `AdminDashboard` cards. No new enum — ponytail, single check.
