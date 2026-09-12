# Wayfinder Map — Admin Surface Loopholes

## Destination
Admin surface is loophole-free and shippable: every `/api/admin/*` + `/admin/*` page + `AdminRoute`/`requireAdmin`/`requireTopAdmin` guard, top-admin tier isolation, user-masquerade (admin create/fav/view/chat) exclusion from public marketplace and all analytics/stats, moderation safety, with decisions locked and spec ready to build.

## Notes
- Domain: Trend Tribe admin (Express `admin.routes.js` + `admin.middleware.js` + `stats.routes.js`, `pwa.controller.js`, `realtime.js`, React `Admin*Page.jsx` + `App.jsx` `AdminRoute`)
- Stack: Prisma `User.role ADMIN` + `TOP_ADMIN_USERNAME Jegede01`, `PlatformProfit/GigWithdrawal` treasury, `views/contactViews/favorites/messages/listings` counters
- Skills every session should consult: `ui-ux-pro-max` for admin UX, `ponytail` for minimal guard
- Mode: Planning only — decisions + spec, no deliverables until map clears (per Wayfinder default)

## Decisions so far
- [admin-loop-01-guards](tickets/admin-loop-01-guards.md): Every `/api/admin/*` is `protect+requireAdmin` (or `requireTopAdmin` for treasury) + `App.jsx` splits `AdminRoute` vs `TopAdminRoute` (Jegede01).
- [admin-loop-03-marketplace-leak](tickets/admin-loop-03-marketplace-leak.md): Public `GET /api/listings` must filter `seller.role != ADMIN`; `revealContact`/`trackContactOpen` skip admin.
- [admin-loop-02-top-tier-ux](tickets/admin-loop-02-top-tier-ux.md): Split `TopAdminRoute` hides Treasury for non-top, `isTopAdmin` username Jegede01 single source.
- [admin-loop-05-delete-safety](tickets/admin-loop-05-delete-safety.md): Block deleting other ADMINs unless TopAdmin, keep self-delete 403 and profit `RESET` confirm, no audit log V1.
- [admin-loop-04-analytics-exclusion](tickets/admin-loop-04-analytics-exclusion.md): Public counts exclude ADMIN, admin view stays unfiltered for audit; stats/pwa already filtered.
- [admin-loop-06-broadcast-scope](tickets/admin-loop-06-broadcast-scope.md): Broadcast/share exclude ADMIN recipients + skip ADMIN test listings, chunked push stays.

## Not yet specified
- Admin seed / promotion flow (how Jegede01 becomes top, how other ADMINs are created)
- Admin audit log / history (who deleted what, profit clear)
- Weekly/daily email `x-cron-secret` vs `protect+requireAdmin` dual path
- PWA analytics `role != ADMIN` exclusion already done vs new marketplace exclusion

## Out of scope
- Gig/Service booking business logic beyond admin treasury/profit (separate effort)
- End-to-end encryption for admin messages
- Non-admin user loopholes (already covered by other maps)
