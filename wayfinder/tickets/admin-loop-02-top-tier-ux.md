---
label: wayfinder:grilling
status: closed
blockedBy: [admin-loop-01-guards]
---

## Question
`backend/src/middleware/admin.middleware.js:13` `TOP_ADMIN_USERNAME Jegede01` + `requireTopAdmin` protects treasury (`/treasury`, `/profit-summary`, `/profit/clear`, `/gig-withdrawals`, `/gig-withdrawals/export`) with 403, but `frontend/src/App.jsx:194-257` `AdminRoute` only checks `role===ADMIN` and renders `/admin/withdrawals`, `/admin/disputes`, `/admin/analytics` etc for any ADMIN, so non-top admin sees Treasury UI then gets 403 on fetch. Should `AdminRoute` split into `AdminRoute` vs `TopAdminRoute` and hide treasury links, or keep 403 UX, and what is the single source for `isTopAdmin` (`username==="Jegede01"` vs `role`)?

## Resolution
Decision: **Hide for non-top — split `TopAdminRoute`**. `App.jsx` adds `TopAdminRoute` checking `user.username==="Jegede01"` (reuse `isTopAdmin`), guards `/admin/withdrawals`, `/admin/analytics` treasury sections + hides nav links for non-top; direct deep-link still 403 via `requireTopAdmin`. Single source `TOP_ADMIN_USERNAME` in `admin.middleware.js:13` is canonical, frontend mirrors same check. Ponytail: one helper, no new role.
