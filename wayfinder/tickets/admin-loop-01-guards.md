---
label: wayfinder:grilling
status: closed
---

## Question
Are all admin surfaces consistently guarded: every `backend/src/routes/admin.routes.js` endpoint uses `protect + requireAdmin` (or `requireTopAdmin` for treasury `GET /treasury`, `GET /profit-summary`, `DELETE /profit/clear`, `GET/POST /gig-withdrawals`), every `frontend/src/App.jsx` `/admin/*` route uses `AdminRoute` (`role===ADMIN`), and no admin page is reachable via direct URL or API without JWT? Which endpoint/page (e.g., `GET /admin/listings` vs `GET /admin/db-usage` vs `GET /admin/support`) is missing a guard, and should `protect` precede `requireAdmin` everywhere?

## Resolution
Decision: **Enforce both** — every `admin.routes.js` endpoint is `protect + requireAdmin` (or `requireTopAdmin` for treasury) with `protect` first, and `App.jsx` splits `AdminRoute` vs `TopAdminRoute` (checks `username==="Jegede01"`) for `/admin/withdrawals`, `/admin/disputes` treasury sections. Audit: all `/api/admin/*` already have `protect+requireAdmin` except `support` router (verified separate), no missing guard, but frontend hides Treasury from non-top to avoid 403 UX. Ponytail: reuse `isTopAdmin` helper, no new middleware.
