# Research — Does success mean fully committed and readable (no replica or async gap)

**Branch:** `research/delete-persist-commit` · **Map:** [#37 Wayfinder — Deleted inbox/chats reappear after restart](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) · **Ticket:** [#39 Research — Does success mean fully committed and readable (no replica or async gap)](https://github.com/Tomiwa-Jegede/trend-tribe/issues/39) · **Date:** 2026-09-13

> Plain English, read-only. No code changed. All claims cited `file:line`.

## 1-sentence gist

**Yes — every delete handler `await`s its Prisma writes before returning `200 { ok: true }`; no fire-and-forget, no queue, no background job returns success early.** The Prisma client is a plain single-primary `PrismaClient` (`backend/src/db.js:6`) with no replica, no Accelerate, no middleware, and `datasource db { url = env("DATABASE_URL") / directUrl = env("DIRECT_URL") }` (`backend/prisma/schema.prisma:5-9`) is the stock Render/pgBouncer direct-vs-pooled split, not a read replica. The only durability gaps are (a) **no `prisma.$transaction`** across the 2–3 statements per handler and (b) **hard-delete failures silently swallowed with `.catch(()=>{})`** that still return `200` — soft-delete already hid the row so this does not explain reappearance, but it hides hard-delete errors. Replica lag is not configured in code and would have to be an infra-level replica on Render (not found).

---

## What was checked

- `backend/src/controllers/message.controller.js:361-442` — `deleteOne`, `deleteMany` (`POST /bulk-delete`), `deleteAll` (`DELETE /`), `deleteConversationsBulk` (`POST /conversations/bulk-delete`) await patterns
- `backend/src/db.js:1-10` — Prisma Client singleton, log config, no pooling/middleware/replica options
- `backend/prisma/schema.prisma:5-9` — `datasource db` `url` / `directUrl` (DATABASE_URL vs DIRECT_URL)
- `backend/prisma.config.ts.bak:1-14` — generated Prisma config (datasource url only, no Accelerate)
- `backend/src/config/env.js:1-43` — `DATABASE_URL` / `DIRECT_URL` required, no replica env, no `?pgbouncer=true` flag handling
- `backend/src/index.js:1-217` — Express bootstrap, `prisma.$connect`, no transaction middleware, no read-replica routing
- `backend/package.json:18-35` — `@prisma/client@5.22.0`, no `@prisma/extension-accelerate`, no `adapter`, no `pg` pooler lib
- `grep` across `backend/src` for `prisma.$use` / `$transaction` / `Accelerate` / `prisma://` / `replica` / `PgBouncer` / `.catch` / `.then` relative to delete paths

> Not measured: live Render Postgres topology (whether Render was provisioned with a read replica or external Neon/Supabase pooled host). Code has no replica wiring — any replica would be infra-level, not app-level.

---

## Q1 — Does the delete handler await before 200?

**Yes, always.** Every delete path `await`s its writes and only then `return res.status(200).json({ ok: true })`. There is no fire-and-forget delete.

| Handler | HTTP | `await`s before `200` | Code |
|---|---|---|---|
| `deleteOne` | `DELETE /:id` | `await update` → `await findUnique` → `await delete?.catch` | `message.controller.js:372,374,376` → `378` |
| `deleteMany` | `POST /bulk-delete` | `await updateMany` (sender) → `await updateMany` (recipient) → `await deleteMany?.catch` | `message.controller.js:391,392,394` → `395` |
| `deleteAll` | `DELETE /` | `await updateMany` (sender) → `await updateMany` (recipient) → `await deleteMany?.catch` | `message.controller.js:404,405,406` → `407` |
| `deleteConversationsBulk` | `POST /conversations/bulk-delete` | loop: `await findFirst` → `await updateMany` → `await deleteMany?.catch` → `await conversation.delete?.catch` per key, then `await deleteMany?.catch` sweep | `message.controller.js:424,426,427,428,436` → `437` |

Contrast with actual fire-and-forget in the same file (not delete, for reference):

- `createMessage` at `message.controller.js:52` does `prisma.conversation.update(...).catch(()=>{})` **without** `await` — intentionally fire-and-forget for `lastMessageAt`.
- Same for `message.controller.js:56-59` (`listing.update` + `contactView.create` ) and `:67-78` (unread count → `sendPushToUser` via `.then`).
- `getThread` at `message.controller.js:238-244` does `prisma.message.updateMany(...).then(...)` for `deliveredAt` — also fire-and-forget.

Delete handlers **do not** use this pattern for the writes that gate `200`. The only `.catch(()=>{})` on delete paths is **after** an `await` on the hard-delete sweep (`:376`, `:394`, `:406`, `:427-428`, `:433`, `:436`) — the promise is awaited, then any rejection is swallowed. Success therefore means the preceding soft-delete `update`/`updateMany` resolved against the driver (Postgres acknowledged commit for that statement).

### What `.catch(()=>{})` actually hides

Hard-delete `delete`/`deleteMany` failures are swallowed and still return `200`. Example `deleteOne:376`:

```js
await prisma.message.delete({ where: { id } }).catch(() => {});
return res.status(200).json({ ok: true }); // :378 — even if delete threw
```

Impact: caller cannot tell soft-only (`senderDeleted=true`) from hard-removed. But **reappearance is not explained by this** — the row stays with `senderDeleted=true`/`recipientDeleted=true` and remains filtered in inbox reads (`getMyMessages` at `:96` filters `recipientDeleted:false`/`senderDeleted:false`; `getThread` at `:224` etc.). The row would stay hidden; the next `GET` would not resurface it. The swallowed error matters for disk bloat / global sweep hygiene, not for "delete reappears after restart" unless reads ignore soft flags (that's ticket #40).

### No queue / background job

- No `Bull`/`Bee-Queue`/`pg-boss`/`sidekiq` dependency in `backend/package.json:16-37`.
- No `setTimeout`/`setInterval`/`queue`/`worker`/`job` in delete paths (`grep` `backend/src/controllers/message.controller.js` for those terms = none in `deleteOne`/`deleteMany`/`deleteAll`/`deleteConversationsBulk`).
- No lazy cleanup triggered by delete — the 30-day TTL janitor in `backend/src/index.js:200-206` is a separate `prisma.message.deleteMany({ where:{ createdAt:{ lt: cutoff } } })` on a 24h timer, unrelated to user-initiated delete.

### Missing transaction — the only commit gap

None of the four handlers use `prisma.$transaction`:

- `deleteMany` does 3 sequential statements (`:391-394`) not atomic — if the process crashes between the two `updateMany`s, one side's flag may be set without the other; the response would be `500` (throw reaches `:398`), not `200`, so not a success-but-not-persisted case. But a crash **after** both `updateMany`s and **before** the final `deleteMany` leaves a row soft-deleted on both sides yet not hard-deleted — still hidden from reads, so not a reappearance either.
- `deleteConversationsBulk` loops keys sequentially with `await` per key (`:418-434`) but no transaction across keys — a failure on key 2 does not roll back key 1. Each key's writes are awaited before the next, so `200` means all keys' awaits resolved.
- Postgres itself is synchronous per statement: `await prisma.message.update(...)` resolves only after the server `COMMIT`s that statement (autocommit). No async replication acknowledgement is needed unless a replica exists.

Elsewhere `$transaction` **is** used (e.g., `payment.controller.js:210`, `listing.controller.js:644,663,866,1065,1233`, `gig.controller.js:24,125,153` etc.) — the codebase knows the pattern but does not apply it to message deletes.

**Conclusion Q1:** `200` means the soft-delete write(s) are durable on the primary. Not fire-and-forget. Not queued.

---

## Q2 — Write-replica vs read-replica gap? Connection pooling? `DATABASE_URL` vs `DIRECT_URL`

### Prisma client config

`backend/src/db.js:1-10`:

```js
const { PrismaClient } = require("@prisma/client");
const config = require("./config/env");
const prisma = new PrismaClient({
  log: config.isDev ? ["query", "info", "warn", "error"] : ["error"],
});
module.exports = prisma;
```

- **No** `datasources` override, no `adapter`, no `accelerateUrl`, no `log` beyond query logs in dev.
- **No** `prisma.$use` / `prisma.$extends` middleware (`grep` `backend/src` for `$use`/`$extends`/`middleware` = none in `src/`; only docs about middleware in `docs/`).
- **No** `readReplicas` extension (`@prisma/extension-read-replicas` not in `backend/package.json`, no `readReplicas` call).

`backend/prisma/schema.prisma:5-9`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- `url` = pooled connection (Render / Neon / Supabase PgBouncer). `directUrl` = direct Postgres for migrations/`prisma migrate`.
- `backend/prisma.config.ts.bak:12` confirms generated config uses `process.env["DATABASE_URL"]` for datasource url (no Accelerate, no `prisma://`).
- `backend/src/config/env.js:6-7` requires both vars at boot and `backend/src/config/env.js:43` exposes `databaseUrl` (unused override — runtime actually uses env directly via Prisma).

### Is there a replica?

**In code: no.** Search results:

- `grep -rn "replica\|prisma://\|accelerate\|readReplicas\|PgBouncer.*pool" backend --include="*.js" --include="*.json" --include="*.prisma"` (excluding `node_modules`) returns only `schema.prisma: url/directUrl` — no replica host, no `prisma://` Accelerate URL, no `?pgbouncer=true` flag handling.
- `backend/package.json:18` has no `@prisma/extension-accelerate` or `@prisma/adapter-pg`.
- `backend/src/index.js:40-41` `prisma.$connect` is single-client; no `PrismaClient({ datasources: { db: { url: replicaUrl } } })` split.

**In infra: plausible but not evidenced.** Render Postgres **can** provision read replicas as separate services with separate URLs, but the app would need to route reads to the replica (either via Prisma read-replicas extension or manual pool). Since the app does not do that, a replica would have to be at the Postgres provider level transparently (e.g., Neon/Supabase pooled read replica behind same `DATABASE_URL`). No evidence in repo for that; confirmation requires checking Render dashboard env values for `DATABASE_URL` / `DIRECT_URL` hostnames and whether they point to `*.pooler.*` vs direct, and whether Render's "High Availability / Read Replica" toggle is on.

### PgBouncer / pooling caveats

- Prisma 5.22 with PgBouncer in **transaction mode** requires `?pgbouncer=true` appended to `DATABASE_URL` and restricts prepared statements. If `DATABASE_URL` points to a PgBouncer pooler without that flag, transient `prepared statement` errors can occur — those would surface as `500`, not silent stale reads.
- In transaction mode, each statement is its own transaction (autocommit) — still durable when `await` resolves. No visibility lag.
- PgBouncer does **not** introduce eventual consistency; it is a connection multiplexer on top of a single primary.

### Would a replica cause exactly this bug?

Yes — if a read hit a lagging async replica within milliseconds of the delete's `200`, the unreplicated delete would reappear. The frontend's 10s `pending*Ref` tombstones (`frontend/src/pages/InboxPage.jsx:80-105` etc.) mask exactly that window — the map Notes say the bug survives a full restart past 10s (`wayfinder` map #37 Notes), so a sub-second replica lag alone would not explain reappearance after force-close/reopen minutes later unless (a) replication is broken for minutes/hours, or (b) reads are served from a cache (ticket #41), or (c) soft-delete reads are not filtered (ticket #40). Replica lag is therefore a **weak hypothesis** for this specific symptom given the 10s hold duration.

**Conclusion Q2:** No replica or pooling gap is wired in code. `directUrl` is migration-only. A hidden infra replica behind `DATABASE_URL` cannot be ruled out without checking Render env/host, but code gives it nowhere to hide for routing — and lag would explain only seconds, not post-restart minutes.

---

## Q3 — Queuing / background job / lazy cleanup returning 200 early?

**None.** All four delete handlers are synchronous Express `async (req,res)` with no queue, no `setImmediate`, no deferred `prisma.*` without `await` gating the response. The `await` → `return 200` sequence is linear. The only async pieces **after** `200` are intentionally outside delete (push, realtime emit), not the commit.

Hard-delete sweeps that use `.catch(()=>{})` still `await` before `200` — they are not lazy; they are eager but error-tolerant.

**Conclusion Q3:** No.

---

## So what *could* still explain success-but-reappears?

Within this ticket's scope (commit/readability), the remaining non-replica, non-async explanations are:

1. **Read-side filter misses (ticket #40)** — `getMyMessages`/`getThread`/`getConversations` may include soft-deleted rows (especially legacy `conversationId:null` paths or `deleteAll`'s orphan `Conversation` shells) so the delete committed but the next `GET` still returns the row.
2. **Cache serving stale (ticket #41)** — no cache layer was found in this pass (`backend/src` has no `redis`/`ioredis`/`node-cache`/`memory-cache` import; `grep` for `cache`/`redis` in `src/` = none), but a CDN/Render/proxy cache or frontend `localStorage` (`InboxPage.jsx:283-285` `savedChats`) could resurrect rows after restart if backend did return correct filtered data.
3. **Client rebuild not exercised** — deletes that only flipped one side's soft flag (`deleteOne`/`deleteMany`/`deleteAll`) intentionally keep the row for the other participant; a tester checking the same account across restart should not see reappearance unless the read filter missed `senderDeleted`/`recipientDeleted`, but a tester checking a second device/account might correctly still see it.

These are for tickets #40/#41 to prove, not this ticket.

---

## File cite index

- `backend/src/controllers/message.controller.js:361-383` `deleteOne` — await + conditional hard delete
- `backend/src/controllers/message.controller.js:385-400` `deleteMany` — two `updateMany` + `deleteMany` sequential, no `$transaction`
- `backend/src/controllers/message.controller.js:402-412` `deleteAll` — global `deleteMany` sweep unscoped
- `backend/src/controllers/message.controller.js:414-442` `deleteConversationsBulk` — per-key loop, `conversation.delete`, global sweep
- `backend/src/controllers/message.controller.js:52,56-59,67-78,238-244` — examples of actual fire-and-forget elsewhere (not delete) for contrast
- `backend/src/db.js:1-10` — plain `PrismaClient`, no replica/pgBouncer/middleware config
- `backend/prisma/schema.prisma:5-9` — `url` vs `directUrl` datasource
- `backend/prisma.config.ts.bak:1-14` — generated config, `DATABASE_URL` only
- `backend/src/config/env.js:5-7,43` — `DATABASE_URL`/`DIRECT_URL` required
- `backend/src/index.js:150-153,200-206` — `prisma.$connect` + chat TTL janitor (not delete-related)
- `backend/package.json:18-37` — no Accelerate / adapter / queue deps

---

## Sources

- `backend/src/controllers/message.controller.js` (read 2026-09-13)
- `backend/src/db.js` (read 2026-09-13)
- `backend/prisma/schema.prisma` (read 2026-09-13)
- `backend/prisma.config.ts.bak` (read 2026-09-13)
- `backend/src/config/env.js` (read 2026-09-13)
- `backend/src/index.js` (read 2026-09-13)
- `backend/package.json` (read 2026-09-13)
- Ticket [#39](https://github.com/Tomiwa-Jegede/trend-tribe/issues/39) and map [#37](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) bodies (fetched 2026-09-13)
