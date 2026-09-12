---
label: wayfinder:grilling
status: closed
blockedBy: [admin-loop-01-guards]
---

## Question
Are admin destructive actions safe: `DELETE /api/admin/listings/:id` (deletes + `cloudinary.destroy` + `prisma.listing.delete` cascade), `DELETE /api/admin/users/:id` (self-delete blocked `id===req.user.id` at `admin.routes.js:274` but can delete other ADMINs), `DELETE /api/admin/profit/clear` (`confirm===RESET`), `PATCH /reports/:id/ignore`? Should other-admin delete be blocked (`where role != ADMIN` or `requireTopAdmin`), should deletes require `confirm` body, and should an audit log (`Notification`/`AdminLog`) record who deleted what for forensics?

## Resolution
Decision: **Block other ADMIN delete** — `DELETE /api/admin/users/:id` returns 403 if `target.role===ADMIN` and `req.user` not TopAdmin (`isTopAdmin`), keep `id===req.user.id` self-block, `DELETE /profit/clear` keeps `confirm===RESET` gate. Listings/reports deletes keep current (any admin can moderate). No audit log for V1 (ponytail YAGNI, add when forensics needed).
