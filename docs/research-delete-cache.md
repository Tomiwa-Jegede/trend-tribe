# Research — Is there any caching on the read side serving stale data

**Branch:** `research/delete-persist-cache` · **Map:** [#37 Wayfinder — Deleted inbox/chats reappear after restart](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) · **Ticket:** [#41 Research — Is there any caching on the read side serving stale data](https://github.com/Tomiwa-Jegede/trend-tribe/issues/41) · **Date:** 2026-09-13

> Plain English, read-only. No code changed. All claims cited `file:line`.

## 1-sentence gist

**No. There is no server-side cache on the read side that could serve stale `GET /messages` or `GET /messages/conversations` after a delete — no Redis, no in-process cache, no CDN cache, no Prisma cache, no app-level memoization. The only caching near the delete path is a 10s frontend tombstone + a Service Worker that is explicitly `NetworkOnly` for `/api/messages`, so neither explains deletes persisting-then-reappearing after a full restart.**

---

## What was checked

- `backend/src/index.js:1-96` — Express bootstrap, middleware stack (helmet/compression/cors/morgan), route mounts, raw webhook handling, no cache middleware
- `backend/src/controllers/message.controller.js:88-359` — `getMyMessages`, `getThread`, `getConversations`, `getMessageById`, `getUnreadCount` read handlers (no cache wrapper, direct `prisma.*` calls)
- `backend/src/db.js:1-10` — Prisma singleton (`new PrismaClient`), no Accelerate, no `cacheStrategy`, no `$use` middleware
- `backend/prisma/schema.prisma:1-9` — datasource `url = env("DATABASE_URL")` / `directUrl = env("DIRECT_URL")`, no `accelerate` preview, no driver adapter
- `backend/package.json:18-35` — deps: no `redis`, `ioredis`, `node-cache`, `lru-cache`, `apicache`, `express-redis-cache`; no `@prisma/extension-accelerate`
- `backend/src/config/env.js:1-88` — required env list + `databaseUrl`/`clientUrlList`/pusher/brevo/cloudinary, no `REDIS_URL`/`CACHE_*`/`CDN_*`
- `backend/src/middleware/*` — `auth.middleware.js`, `optionalAuth.middleware.js`, `rateLimit.js`, `upload.middleware.js`, `validate.js`, `admin.middleware.js`, `verified.middleware.js` — no cache, no etag, no response-cache
- `backend/src/routes/stats.routes.js:9,17` and `backend/src/routes/sitemap.routes.js:19-74` — only places that set `Cache-Control` or in-memory `cache` (plus `frontend/src/pages/HomePage.jsx:122-140` `localStorage` for stats — not messages)
- `backend/src/realtime.js:1-40` — `onlineCounts`/`lastSeen`/`lastActive` Maps (presence only, not message cache)
- `frontend/vite.config.js:42-103` — `VitePWA` + `workbox.runtimeCaching` (messages = `NetworkOnly`, see below)
- `frontend/src/api/axios.js:1-51` — axios client, no cache interceptor, no `Cache-Control` header set
- `frontend/src/services/messageService.js:1-38` — thin `api.get/post/delete` wrappers, no memo, no SWR/React-Query
- `frontend/src/pages/InboxPage.jsx:80-188` — `pendingDeletesRef`/`pendingChatDeletesRef`/`pendingDeleteAllRef` 10s tombstones + 5s polling (client, not server)
- Repo root — no `render.yaml`, no Render Key Value addon, no `netlify.toml` API cache, no `.env.example` with cache vars
- `grep -R` across `backend/` + `frontend/src` for `redis|REDIS|ioredis|node-cache|lru|apicache|accelerate|cacheStrategy|Cache-Control|ETag|cdn|cloudfront` (full results in Short table)

> Not measured: live Render Postgres topology (whether the host is behind an external read-replica or proxy-level cache at the infra edge). Code has no replica/cache wiring — any such layer would be infra-level, not app-level. Also not measured: browser HTTP cache for credentialed `GET /api/messages` (see HTTP cache note below — not a source of "reappears after restart" as defined).

---

## Short table — every cache surface that could matter, and whether it exists

| Surface | Looked at | Exists? | Key / TTL / bust on delete | Serves stale after delete? |
|---|---|---|---|---|
| **Redis / Valkey / any external cache on `getMyMessages` / `getConversations`** | `backend/package.json` deps, `backend/src/**` imports, `backend/src/config/env.js` env list, `backend/src/db.js` Prisma opts, `grep redis` across backend | **No** | — | **No** |
| **In-process memory cache / memoization on those handlers** | `backend/src/controllers/message.controller.js:88-359` handler bodies, `backend/src/index.js` middleware, `grep node-cache|lru|apicache|memo` | **No** | — | **No** |
| **Prisma query cache / Accelerate / Data Proxy / `cacheStrategy`** | `backend/src/db.js:6`, `backend/prisma/schema.prisma:1-9`, `backend/package.json` (no `@prisma/extension-accelerate`), `grep accelerate|cacheStrategy` | **No** | — | **No — every read is `prisma.message.findMany/count` direct to Postgres via `DATABASE_URL`** |
| **CDN cache on `/api/messages*`** (CloudFront/Fastly/Cloudflare/Netlify edge for API) | `backend/src/index.js` headers (no `Cache-Control` on message routes), `frontend/vite.config.js` SW rules, `grep Cache-Control|CDN|cloudfront` | **No** for API | Only `Cache-Control: public, max-age=60` on `GET /api/stats` (`stats.routes.js:17`) and `max-age=3600` + in-memory `cache` on `/sitemap.xml` (`sitemap.routes.js:19-20,66-74`); message routes send no `Cache-Control`, no `ETag`/`Vary` | **No — message responses are not marked cacheable, and no CDN is configured for the Render API origin** |
| **Render add-ons (Key Value / Redis, edge cache)** | repo `render.yaml` (absent), `backend/.env` / `backend/src/config/env.js` (no `REDIS_URL`), Render dashboard region/add-on (not in repo) | **No** | — | **No** |
| **App-level `compression` / `helmet` / `morgan` as cache** | `backend/src/index.js:15,52,43,50` | **No** — `compression` is transfer encoding, `helmet` is security headers, neither caches | — | **No** |
| **Frontend Service Worker (Workbox) cache for `/api/messages*`** | `frontend/vite.config.js:82-96` `runtimeCaching` | **Explicitly `NetworkOnly` for messages** | `urlPattern: /\/api\/(listings\|auth\/me\|notifications\|messages\|stats)/` → `NetworkOnly` (`vite.config.js:86-89`); generic `/api/*` `NetworkFirst` with `maxAgeSeconds:30` exists but is ordered **after** the messages rule so it never applies to messages | **No — SW never serves stale messages; it goes to network every time (offline = network error, not stale)** |
| **Frontend HTTP/Axios cache** | `frontend/src/api/axios.js:1-51`, `frontend/src/services/messageService.js:1-38` | **No** — no interceptor, no `Cache-Control` request header, no SWR/React-Query | — | **No** |
| **Frontend `localStorage` / in-memory "cache" for messages** | `frontend/src/pages/InboxPage.jsx:80-106,184-188`, `frontend/src/context/AuthContext.jsx:14` | **Only `pendingDeletesRef`/`pendingChatDeletesRef`/`pendingDeleteAllRef` Sets + `tt_saved_chats`** — not a message cache | Tombstone Sets: 10s hold, cleared via `setTimeout(...,10000)` at `InboxPage.jsx:228,253,269,289,304`; `tt_saved_chats` is a pending-chat shell list for `?thread=` drafts (`InboxPage.jsx:69-71,340-347`), not inbox messages | **No — tombstones hide until the 5s poll (`:186`) or push refetch catches up; after a full restart the Sets are gone, so tombstones cannot cause reappearance — they can only mask it for 10s** |
| **Browser HTTP cache for `GET /api/messages` (credentialed)** | `backend/src/index.js` (no `Cache-Control`/`ETag` on messages), `frontend/src/api/axios.js` (no `cache: no-store`) | **No explicit header, browser default applies** | `GET /api/messages` is sent with `Authorization: Bearer ...` (`axios.js:17-20`); browsers treat `Authorization` responses as private by default and revalidate; `POST /bulk-delete` etc are not cacheable | **No — the bug is "reappears after force-close and reopen" (map #37 Notes) — restarting the app/browser clears any memory/http cache and still re-fetches; browser cache would hide, not resurrect, under auth** |

---

## Per-surface detail (with cites)

### 1. Redis or any in-process cache on `getMyMessages` / `getConversations` — **does not exist**

Exhaustive search:

- `backend/package.json:18-35` has no `redis`, `ioredis`, `rediss`, `node-cache`, `lru-cache`, `memory-cache`, `apicache`, `express-redis-cache`. The only store-ish dep is `express-rate-limit` (`rateLimit.js:1-60`) backed by MemoryStore for rate limits — not for message reads.
- `backend/src/controllers/message.controller.js:88-359` — every read is a bare `prisma.message.findMany/count` or `prisma.conversation.findMany` with `where`/`orderBy`/`take`/`include` and no wrapper like `cache.wrap`/`getOrSet`/`memo`. No `Map`/object keyed by `userId` used as cache for messages. The only `Map`s in the codebase are `realtime.js:10-12` `onlineCounts`/`lastSeen`/`lastActive` for presence — not for message rows.
- `backend/src/config/env.js:1-88` lists `REQUIRED_VARS` (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, etc.) — no `REDIS_URL`, `CACHE_TTL`, `REDIS_TLS_URL`, `UPSTASH_REDIS_REST_URL`. `backend/.env` on disk similarly has no `REDIS` var (redacted dump checked 2026-09-13: `BREVO_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `VAPID_*`, `PUSHER_*` only).
- `grep -R redis|ioredis|node-cache|lru` across `backend/` returns only `package-lock.json` transitive `vary`/`etag` hits (HTTP header libs, not caches) plus unrelated `otpExpiresAt` hits — zero application cache code.
- `backend/src/db.js:6` is `new PrismaClient({ log: ... })` with no `accelerate` URL (`prisma://` vs `postgresql://`), no `adapter`, no `cacheStrategy` option. `backend/prisma.config.ts.bak:1-14` is stock `defineConfig({ schema:"prisma/schema.prisma", datasource:{url:process.env.DATABASE_URL}})` — no Accelerate. No `prisma.$use`/`$extends` middleware anywhere in `backend/src` (`grep $use|extends` returns only `AuthContext`/`supportService` hits).

**So: no cache key, no TTL, no bust-on-delete to audit — because there is no cache.**

### 2. CDN / HTTP cache on `/api/messages*` — **does not exist**

- `backend/src/index.js:28-96` sets `helmet`, `compression`, `cors`, `morgan`, and mounts `/api/messages` (`:61`) — no `apicache`, no `express-cache-middleware`, no `res.set("Cache-Control")` on message routes. The only `Cache-Control` assignments in the repo are:
  - `backend/src/routes/stats.routes.js:17` `res.set("Cache-Control","public, max-age=60")` for `GET /api/stats` (and `stats` realtime/localStorage cache in `HomePage.jsx:122-155` — explicit 60s, unrelated to messages).
  - `backend/src/routes/sitemap.routes.js:19-20,66-74` in-memory `let cache={xml,expiresAt}` with `CACHE_MS=60*60*1000` (1h) + `Cache-Control public, max-age=3600` — sitemap only.
- No `ETag`/`If-None-Match`/`Vary`/`Expires`/`Pragma` set on message handlers; `compression` (`index.js:15,52`) is not a cache, `helmet` (`:43-49`) does not set caching headers for API (CSP/CORP only).
- Render does not run a CDN in front of the API by default; Cloudinary (`backend/src/config/cloudinary.js`, `backend/src/middleware/upload.middleware.js`) fronts images only. Netlify hosts the `frontend/` SPA — its `netlify/functions` dir is empty and there is no `netlify.toml` edge cache for `/api` (API is on Render `API_URL`, not Netlify Functions).
- Even if a transparent HTTP cache existed upstream, `GET /api/messages` and `GET /api/messages/conversations` require `Authorization: Bearer ...` (`auth.middleware.js:6-48`, `message.routes.js:6` `router.use(protect)`). `Authorization` responses are not stored by shared caches per HTTP spec unless explicitly marked `public` — which they are not here — so an upstream CDN would not cache them without misconfiguration.

### 3. Prisma query cache / Accelerate / Data Proxy — **does not exist**

- `backend/src/db.js:6` is a singleton `PrismaClient` with `log` only. No `new PrismaClient({ accelerateUrl })`, no `withAccelerate()` extension, no `cacheStrategy: { ttl, swr }` on any query. Repo `grep accelerate|cacheStrategy|ttl.*swr` returns zero hits outside `otpExpiresAt` (OTP expiry, not cache). `package.json` has no `@prisma/extension-accelerate` or `@prisma/adapter-*`.
- Every message read is `await prisma.message.findMany / count / findUnique` directly — no wrapper, no `prisma.$transaction` with caching hint, no `pgBouncer` `?pgbouncer=true` query param handling (datasource is plain `postgresql://` via `env("DATABASE_URL")` `schema.prisma:5-9`).

### 4. Frontend Service Worker / Workbox caching for messages — **explicitly NetworkOnly (not stale)**

This is the only cache surface that *mentions* `/api/messages`, and it is deliberately disabled for messages:

```js
// frontend/vite.config.js:82-96
workbox: {
  runtimeCaching: [
    { urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i, handler: "CacheFirst", ... },
    {
      // Realtime-critical: never serve stale — must be NetworkOnly ...
      urlPattern: /\/api\/(listings|auth\/me|notifications|messages|stats)(\/.*)?(\?.*)?$/i,
      handler: "NetworkOnly", // vite.config.js:88-89
    },
    { urlPattern: /^https:\/\/trendtribe\.app\/api\/.*/i, handler: "NetworkFirst", options:{ cacheName:"api-cache", networkTimeoutSeconds:2, expiration:{maxEntries:50,maxAgeSeconds:30}}},
    { urlPattern: /\/api\/.*/i, handler: "NetworkFirst", options:{ cacheName:"api-cache-local", networkTimeoutSeconds:2, expiration:{maxEntries:50,maxAgeSeconds:30}}},
  ],
}
```

Built SW `frontend/dist/sw.js:1` registers `NetworkOnly` for `GET /api/.../messages...` — Workbox never stores or replays those responses; offline = fetch failure, not cached JSON. The two `NetworkFirst` `api-cache` entries have 30s TTL but Workbox route matching is first-match-wins — the messages `NetworkOnly` rule above them shadows the generic `/api/*` fallback, so messages never hit `api-cache`/`api-cache-local`. Other routes (`/api/listings`, `/api/stats`) could have 30s SW fallback, but inbox/chats specifically cannot.

`frontend/public/_headers`, `frontend/public/push-handler.js`, and `frontend/dist/workbox-*.js` confirm no extra caching layer; `frontend/src/api/axios.js` sets no `Cache-Control` request header.

### 5. Frontend optimistic tombstones — **10s, in-memory, not a persistence bug**

`frontend/src/pages/InboxPage.jsx:80-128,184-310`:

- `pendingDeletesRef = useRef(new Set())` (`:81`), `pendingChatDeletesRef` (`:82`), `pendingDeleteAllRef` (`:83`) hold ids/keys that were just deleted.
- `fetchMessages` at `:94-105` filters `nextMessages.filter(m => !pendingDeletesRef.has(m.id))` and `pendingDeleteAllRef ? []` — so the 5s poll (`:186` `setInterval(fetchMessages,5000)`) and push-triggered `fetchMessages(false)` (`:164-181`) won't resurrect a row for 10s while a replica or `deleteMany` sweeps.
- Each delete handler adds to the set (`:218,247,264,279`) then `setTimeout(...,10000)` clears it (`:228,253,269,289,304`). On error the set is cleared immediately (`:230,255,271,291,306`).
- `tt_saved_chats` in `localStorage` (`:69-71,119-121,284-285,340-347`) is not an inbox cache — it stores pending `?thread=` shells created before the first message, so "Open chat" survives refresh; it is unrelated to `GET /messages` staleness.

This is **client-side masking**, and it is explicitly called out in the map as "already has 10s in-memory hold ... that only smooths minor gaps — bug is backend serving old data after restart, not to be masked further" — after a full app restart all three `useRef` Sets and React state are lost, and the app re-fetches `GET /messages` + `GET /conversations` fresh. So tombstones cannot explain "reappears after restart" — they are the opposite: they hide reappearance briefly, then it returns when the TTL expires.

---

## Answer to the ticket question

> Redis or any in-process cache on `getMyMessages` / `getConversations`?
> CDN, Prisma query cache, or app-level memoization?
> Check `backend/src`, `config`, `middleware`, and Render add-ons. If no cache exists today, state that plainly (don't guess).
> If cache exists, note key, TTL, and whether delete busts it.

**Plainly: no cache exists today on the read side for `getMyMessages` / `getConversations`.** Every check above came back negative. There is also no CDN/Prisma/Render cache in front of those endpoints, and the frontend Service Worker is `NetworkOnly` for messages (no TTL, no stale). Therefore there is no key/TTL to note and no delete-bust hook missing — deletes hit Postgres directly (`message.controller.js:361-442` `await prisma.message.update/deleteMany`) and the next `GET /messages*` hits Postgres directly too. If a delete appears to "reappear after restart" while this code is unchanged, look at the other tickets: `deleteAll` not deleting `Conversation` rows (ticket 40 conversation-shell miss) and non-transactional multi-statement deletes (ticket 39), not a read-side cache.

---

## File cite index

- `backend/src/controllers/message.controller.js:88-117,171-251,302-359` reads (`getMyMessages`, `getThread`, `getConversations`) — no cache wrapper
- `backend/src/controllers/message.controller.js:361-442` deletes (`deleteOne`, `deleteMany`, `deleteAll`, `deleteConversationsBulk`) — `await` before 200, no cache bust
- `backend/src/routes/message.routes.js:1-23` `router.use(protect)` + route mapping (all messages routes auth-gated, no cache middleware)
- `backend/src/db.js:1-10` Prisma singleton — `log` only, no cache/Accelerate
- `backend/prisma/schema.prisma:5-9` datasource `postgresql://` via `env("DATABASE_URL")`/`DIRECT_URL`
- `backend/package.json:18-35` deps — no redis/cache libs, no accelerate
- `backend/src/config/env.js:5-88` `REQUIRED_VARS` + `config` — no `REDIS_URL`/`CACHE_*`
- `backend/src/middleware/auth.middleware.js:1-48`, `optionalAuth.middleware.js`, `rateLimit.js`, `admin.middleware.js`, `upload.middleware.js` — no cache
- `backend/src/index.js:12-62` `express`/`helmet`/`compression`/`cors`/`morgan` + route mounts — no cache middleware, no `Cache-Control` on messages
- `backend/src/routes/stats.routes.js:17` `Cache-Control: public, max-age=60` (stats only) + `backend/src/routes/sitemap.routes.js:19-74` 1h in-memory cache (sitemap only)
- `backend/src/realtime.js:10-12` presence Maps — not a message cache
- `frontend/vite.config.js:82-96` `workbox.runtimeCaching` — `NetworkOnly` for `/api/.../messages`
- `frontend/dist/sw.js:1` built SW — `NetworkOnly` registration for messages confirmed in bundle
- `frontend/src/api/axios.js:1-51` no cache interceptor/headers
- `frontend/src/services/messageService.js:1-38` no memo/cache
- `frontend/src/pages/InboxPage.jsx:80-188,214-310` 10s tombstone Sets + 5s poll + `tt_saved_chats` (client only, expires on restart)
- Repo root — no `render.yaml`/`netlify.toml` API cache, no `.env.example` cache vars

---

## Sources

- `backend/src/controllers/message.controller.js` (read 2026-09-13)
- `backend/src/routes/message.routes.js` (read 2026-09-13)
- `backend/src/db.js` + `backend/prisma/schema.prisma` (read 2026-09-13)
- `backend/package.json` + `backend/src/config/env.js` + `backend/src/index.js` (read 2026-09-13)
- `backend/src/middleware/*` (read 2026-09-13)
- `frontend/vite.config.js` + `frontend/dist/sw.js` + `frontend/src/api/axios.js` + `frontend/src/services/messageService.js` (read 2026-09-13)
- `frontend/src/pages/InboxPage.jsx` (read 2026-09-13)
- `grep -R redis|lru|apicache|accelerate|Cache-Control|ETag|cdn|cloudfront` across `backend/` + `frontend/src` (run 2026-09-13)
- Map [#37](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) and ticket [#41](https://github.com/Tomiwa-Jegede/trend-tribe/issues/41) bodies (fetched 2026-09-13)
