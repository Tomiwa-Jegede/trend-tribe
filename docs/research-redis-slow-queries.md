# Research — What's actually slow now: audit repeated expensive queries

**Branch:** `research/redis-slow-queries` · **Map:** [#31 Wayfinder — Redis caching plan](https://github.com/Tomiwa-Jegede/trend-tribe/issues/31) · **Ticket:** [#32 Research — What's actually slow now](https://github.com/Tomiwa-Jegede/trend-tribe/issues/32) · **Date:** 2026-09-13

> Plain-English audit. No guesses — every row cites `file:line`. Checked `backend/src/controllers/*.js`, `backend/src/routes/*`, `prisma/schema.prisma`, `frontend/src/components/pwa/PWARegister.jsx` + `frontend/src/components/layout/Navbar.jsx` + `frontend/src/pages/InboxPage.jsx`. Did not run prod metrics — so frequency is "code-observed interval", not measured p95.

---

## 1-sentence gist

Listing feed, gig availability, stats hero, and unread-count badge polls all hit Postgres on every page or every 5–30 s and return near-identical data; chat messages, wallet balances, escrow, and presence must stay uncached.

---

## What was checked vs not measured

| Checked (code read) | Could not measure without prod logs/metrics |
|---|---|
| Every Prisma query shape in `listing.controller.js`, `gig.controller.js`, `message.controller.js`, `notification.controller.js`, `serviceBooking.controller.js`, `frederick.controller.js`, `pwa.controller.js`, `stats.routes.js`, `payment.controller.js` | Real p50/p95 latency, rows scanned vs index hit, qps, slow-query log |
| Polling intervals in `PWARegister.jsx:30,79,95`, `Navbar.jsx:92-118`, `NotificationBell.jsx:36-88`, `InboxPage.jsx:183-188`, `HomePage.jsx:151`, `ChatThread.jsx:106` | Whether `prisma.user.count()` inside `getDisplayViews` dominates vs feed query |
| Schema indexes in `prisma/schema.prisma` | Actual `EXPLAIN ANALYZE` cost on Render Postgres, connection-pool pressure |
| Realtime vs polling fallback in `realtime.js` + `useRealtime.js` | Cache hit-rate if we cached 30–60 s |

---

## Hot-path table — runs often, rarely changes, expensive without cache

### A) Marketplace feed — the #1 DB load driver

| Hot path | File:line | Query shape (what hits DB) | How often it runs | Changes every request? | What a cache hit saves |
|---|---|---|---|---|---|
| `GET /api/listings?search=&category=&sort=newest` (default marketplace) | `backend/src/controllers/listing.controller.js:329-355` | `Promise.all([ listing.findMany where+orderBy boostedUntil desc + sort, skip/take ≤48 include seller+_count.favorites , listing.count where ])` + `user.count()` for `getDisplayViews` (line 354). Two heavy reads + one count per page. | Every marketplace visit, pagination, filter change, back-nav, and any socket `listing` refresh. Most-visited route. | **No.** Listing set only changes on create/update/delete/boost (≈ few / hour). `user.count` changes on signup only. Same result for all anonymous users with same filters for minutes. | Avoids 2–3 reads per request (findMany + count + user.count). On burst (100 users browsing) that's 200–300 reads that are identical for 30–60 s. |
| `GET /api/listings?sort=random` ("Discover" / shuffle) | `listing.controller.js:248-294` | `listing.count where` (249) → `listing.findMany select {id} take cap2000 orderBy id desc` (251) → Fisher-Yates shuffle in JS (253-256) → `listing.findMany where id in pagedIds include seller+_count` (260-275) → `user.count()` (280). Up to **4 DB round-trips**. | Every Discover shuffle / random feed load. | **No** — same pool of available listings for minutes. Random order is intentional difference, but can be cached as "a random snapshot for 30 s" without harm. | Saves 3–4 reads including capped 2000-id scan. Biggest per-request cost in codebase. |
| `GET /api/listings?boosted=true` / `?picks=true` (Featured / Picks strip) | `listing.controller.js:221-228` | Same as feed but `where boostedUntil > now` (+ `boostTier=2` for Picks). | Rendered at top of every Marketplace page. | **Stable for minutes** — boost window is 24 h. Only changes on boost. | Same as feed; can share cache key `boosted:true` for 30–60 s and reuse across all users. |
| `GET /api/listings/:id` detail | `listing.controller.js:454-512` | `findListingByIdentifier` → `listing.findUnique where slug` or `id` + fallback `findFirst slug startsWith` (lines 165-177) include `seller + listings count`. Fire-and-forget `listingView.create` + `listing.update views++` if authed non-owner (483-496). | Every card tap. | **Mostly stable.** Views increments once per user per day, but detail payload same for hours. | Cache detail JSON for 60 s with `views` stripped out (serve views stale or fetch separately). |
| `GET /api/stats` (hero: Active Listings, Students, Community) | `backend/src/routes/stats.routes.js:10-16` | `Promise.all([ listing.count where isAvailable true archivedAt null seller role != ADMIN , user.count where role != ADMIN , siteConfig.findUnique ])` + `Cache-Control: public, max-age=60` header (line 17). | HomePage polls every **30 s** (`frontend/src/pages/HomePage.jsx:151`) plus `localStorage` cache, and every `listing:created` realtime triggers refetch (155). | **No — changes only on new listing/user.** Counts same for all viewers. | Saves 2 counts per 30 s per home visitor. Already HTTP-cached 60 s at CDN edge; Redis would extend to cross-instance. |
| `GET /api/listings/me` / `GET /api/listings/user/:id` (profile grids) | `listing.controller.js:948-980` / `1084-1140` | `findMany + count` with seller counts. | Profile visits. | Relatively stable (changes only on owner's add/delete). Per-user, not cross-user. | Per-user cache 30 s possible but lower impact than global feed. |

**Why feed is special:** `where` uses `title contains ilike`, `category`, `subcategory`, `condition`, `price gte/lte` — all on unindexed text enum paths; no composite index covering filter + sort. `orderBy boostedUntil desc nullsLast` forces sort on nullable timestamp. Cost grows with table size.

### B) Gigs — second feed

| Hot path | File:line | Query shape | How often | Stable? | Cache saves |
|---|---|---|---|---|---|
| `GET /api/gigs?` availability feed | `backend/src/controllers/gig.controller.js:65-75` | `gig.findMany where status=OPEN expiresAt > now orderBy createdAt desc skip/take` + `gig.count where` (lines 72-74) | Every Services/Gigs feed visit + Navbar badge count (`frontend/src/components/layout/Navbar.jsx:129-141` fetches `getGigs limit 50` on **every mount** and counts open). | **No** — set only changes on create/claim/cancel/expire (minutes–hours). | Single cached `gig:feed:OPEN` + `gig:count:OPEN` for 30 s replaces two reads per visitor. Also fixes Navbar hammer (currently fetches 50 gigs per page load just for count). |
| Navbar Services badge | `Navbar.jsx:128-141` | Same feed but `take 50` then JS filter `status===OPEN` — wasteful, should be count. | On every route mount. | Same as above. | Cache count instead of list. |

### C) Notifications / Messages unread — the polling hot path

| Hot path | File:line | Query shape | Interval | Stable? | Cache saves |
|---|---|---|---|---|---|
| `GET /api/notifications/unread-count` — `where { userId, read:false }` | `backend/src/controllers/notification.controller.js:57-64` | `notification.count` with index `@@index([userId, read])` (`schema.prisma:197`). | **Navbar** fetches on auth/user change (`Navbar.jsx:96-118`) + realtime `notification` invalidates (105-106). **PWARegister** badge sync does `Promise.all(notif+msg)` every **30 s when visible** (`PWARegister.jsx:79`) + on focus/visibility/push. | **Changes only when notification lands** (favorite/new-listing/booking). For most users, 0 for hours. | Cache per-user `unread:notif:{userId}` for **15 s** would collapse 2×/min per tab to ~0 DB when nothing happened. Index helps but count still per-request. |
| `GET /api/messages/unread-count` — `where { recipientId, read:false, listingId not null, sender.role != ADMIN }` | `backend/src/controllers/message.controller.js:158-169` | `message.count` with indexes `recipientId_read` + join to `sender.role`. | Same as above: Navbar (92-104) + PWARegister 30 s poll + **Inbox 5 s poll when visible** (`InboxPage.jsx:185-187` `setInterval 5000`). | Changes only on new chat inbound. | Same — per-user cache 10–15 s cuts worst poll (Inbox 12/min per open tab). Also double-fetch: PWARegister and Navbar both fetch independently on same page — should be single source (already partially deduped in `NotificationBell.jsx:14,37` but not in PWARegister). |
| `GET /api/notifications` list (bell dropdown) | `notification.controller.js:4-50` | `findMany where userId orderBy createdAt desc skip/take + count + actor lookup` | On bell open only. Not poll. | Moderate churn. | Don't cache — read-on-open is correctness. |
| `GET /api/messages/conversations` inbox list | `message.controller.js:302-359` | `conversation.findMany` (305) + **`await` loop `message.count where conversationId unread` for each convo (320)** — N+1. Plus legacy `message.findMany where conversationId null` (326). | Every Inbox `/chat` visit and every **5 s poll** (`InboxPage.jsx:183-188`) + realtime. | Conversations list stable unless new message. | Cache infra aside, biggest fix is N+1 removal: add `_count` or batch count. Redis would hide N+1 but not fix it. |

**Poll arithmetic:** One user with Navbar + PWARegister + Inbox open makes **~ (PWARegister 2/min ×2 counts) + (Inbox 12/min ×2 fetches + N+1 counts) = ~16 DB count queries/min** while idle. With 200 concurrent viewers that's ~3k counts/min of identical `0` or same small number.

### D) Chat threads & presence — **do NOT cache** (must stay fresh)

| Path | File:line | Why risky |
|---|---|---|
| `GET /api/messages/thread?listingId&with` | `message.controller.js:171-251` | Must show new message instantly; caching would delay delivery. Realtime already invalidates via `useRealtime("message")`. |
| `GET /api/messages/presence?ids=` | `message.controller.js:267-277` + `realtime.js:15-20` | Reads **in-memory maps** `onlineCounts/lastActive`, not DB. Already cached in memory. No Redis needed. |
| `GET /api/services` bookings / `serviceBooking.controller.js:6-240` | `serviceBooking.controller.js` | Escrow/amount/funded in Gig wallet — money path. Must be fresh. |
| `GET /api/gigs/wallet/history` + `transfer`/`withdraw`/`payments` | `gig.controller.js:621-800` | Naira wallet, transaction ledger, PIN-gated. Never cache. |
| `GET /api/frederick/chat` catalog load | `frederick.controller.js:240-256` | `listing.findMany take 200` uncached today; could be cached 60 s as catalog snapshot but is token-gated shopping — low frequency vs feed. |

### E) Other stable-but-less-hot paths

| Path | File:line | Note |
|---|---|---|
| `GET /api/pwa/stats` + `PWAInstall.count/groupBy` | `backend/src/controllers/pwa.controller.js:48-77` | Admin-only, rare. No need. |
| `GET /api/listings/favorites/ids` / `favorites/mine` | `listing.controller.js:1387-1458` | Per-user, fetched on auth; could be cached per-user 30 s but low traffic vs feed. Favorite toggle also does `favorite.count where listingId` (315,337) for realtime emit — that count is tiny. |
| `listing.count for getDisplayViews` | `listing.controller.js:280,354` | `user.count` inside fake-view calc runs **every feed request** — should be cached globally (totalUsers). Easy win. |

---

## Indexes — what's already covered vs missing

Schema (`prisma/schema.prisma`) already has:

- `Notification @@index([userId, read])` — line 197
- `Message @@index([recipientId, read])` / `[recipientId, createdAt]` — lines 267-268
- `Gig @@index([status, expiresAt])` — line 380 (covers `status=OPEN expiresAt>now`)
- `Conversation @@index([buyerId])`/`[sellerId]` — lines 243-244

Missing that hurts feed:

- No composite index on `Listing (isAvailable, category, subcategory, condition, price, boostedUntil, createdAt)` — filter + sort touches full scan as table grows. Check `EXPLAIN ANALYZE` before adding.
- No `Listing @@index([isAvailable, boostedUntil])` separately for featured sort.

---

## Polling map (frontend-observed, not prod-measured)

| Component | File:line | Interval | What it polls | Visible-only? |
|---|---|---|---|---|
| `PWARegister` badge sync | `frontend/src/components/pwa/PWARegister.jsx:79` | **30 s** | `GET /notifications/unread-count` + `GET /messages/unread-count` (Promise.all) | Yes (`document.visibilityState === "visible"`) |
| `PWARegister` SW update | `PWARegister.jsx:30` | **60 min** | `swReg.update()` | No |
| `PWARegister` health ping (Render wake) | `PWARegister.jsx:95` | **5 min** | `GET /health` (→ `SELECT 1`) | Yes |
| `InboxPage` conversations + messages | `frontend/src/pages/InboxPage.jsx:185-187` | **5 s** | `getMyMessages` + `getConversations` (incl. N+1 unread per convo) | Yes |
| `HomePage` stats hero | `frontend/src/pages/HomePage.jsx:151` | **30 s** | `GET /stats` (2 counts) | No (cleans on unmount) |
| `Navbar` unread fetches | `frontend/src/components/layout/Navbar.jsx:92-118` | **on mount / auth / user change + realtime** — no timer, but `NotificationBell` reuses via `externalUnread` prop | same unread-counts | — |
| `ChatThread` presence ping | `frontend/src/components/chat/ChatThread.jsx:106` | **60 s** | `presence:ping` socket (no DB) | No |
| `Discovery / filter` debounce | `frontend/src/components/listings/FilterBar.jsx:21` | **320 ms debounce** | feed query | — |

Realtime path (`useRealtime` → Pusher → Socket fallback → SW `postMessage` fallback) already covers most invalidation, but **polling remains as fallback when Pusher/Socket throttled or tab hidden** — so cache must tolerate stale reads while still updating on socket event.

---

## What to cache vs what to leave

**Safe to cache (stable, non-money, global or per-user read-heavy):**

1. **Listing feed** — key by `search|category|subcategory|condition|minPrice|maxPrice|sort|page|limit|boosted|picks` — TTL 30–60 s. Saves 2–4 reads per request.
2. **`prisma.user.count()` totalUsers** — TTL 60–120 s globally. Saves one count per feed + per stats request.
3. **`GET /stats` hero** — already HTTP 60 s; Redis key `stats:hero` TTL 60 s makes it cross-instance.
4. **`Gig feed + count (OPEN)`** — TTL 30 s. Also fixes Navbar badge hammer.
5. **Per-user unread counts** — TTL 10–15 s, **invalidate on socket `notification`/`message` or on read/delete**. Short TTL bounds stale badge to 15 s worst case, but saves 80–90% of 5–30 s poll hits when idle.

**Risky / do not cache:**

- Chat thread messages, wallet balances/history, service booking state, escrow amounts, payment webhook writes, presence `lastActive`, `Favorite` toggle write path, `listingView`/`contactView` increments (fire-and-forget writes).

---

## One-line risks to name in final plan

- Feed cache key explosion if `search` text not normalized/hashed. Cap `search` length and hash key.
- `sort=random` cache must vary key per page or serve same snapshot to all viewers for TTL window — document choice.
- Per-user unread cache needs `del key` on `notification.create` / `message.create` / `markRead` / `delete`; if invalidation missed, badge lies until TTL. Prefer short TTL + explicit del.
- Navbar currently fetches `gigs limit 50` to count open — fix to `count` before caching, or cache the count directly.

---

## Gaps for final plan to close before build

1. Confirm Render Postgres `pg_stat_statements` top queries to validate ranking (feed vs unread vs stats).
2. Decide cache client (`ioredis` vs `node-redis`), where Redis runs (Render Key-Value vs external), cost, and fallback when Redis is down (serve-through to DB, don't 500).
3. Write exact invalidation map per key and TTLs for the 1–2 first targets (recommend: **feed + totalUsers + gig availability** as target 1, **unread counts** as target 2 if invalidation proven via socket).
4. No code in this ticket — owner signs off on `docs/redis-plan.md` shape before any build branch.

---

## Sources

- `backend/src/controllers/listing.controller.js:200-396,454,948,1084,1178,1387,1404,1463`
- `backend/src/controllers/gig.controller.js:65-94,621-800`
- `backend/src/controllers/message.controller.js:90-112,158-169,171-251,302-359`
- `backend/src/controllers/notification.controller.js:4-64`
- `backend/src/controllers/pwa.controller.js:48-77`
- `backend/src/controllers/frederick.controller.js:240-256`
- `backend/src/controllers/serviceBooking.controller.js:6-253`
- `backend/src/routes/stats.routes.js:10-16`
- `backend/src/routes/listing.routes.js:41-71` / `message.routes.js:1-23` / `gig.routes.js:10-42`
- `prisma/schema.prisma:197,267-268,380,386,453`
- `frontend/src/components/pwa/PWARegister.jsx:30,52-99`
- `frontend/src/components/layout/Navbar.jsx:92-141`
- `frontend/src/components/notifications/NotificationBell.jsx:13-88`
- `frontend/src/pages/InboxPage.jsx:89-188`
- `frontend/src/pages/HomePage.jsx:122-156`
- `frontend/src/components/chat/ChatThread.jsx:106,143`
- `backend/src/realtime.js:15-42,147-236` / `frontend/src/hooks/useRealtime.js:1-58`

