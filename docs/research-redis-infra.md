# Research — Where would Redis run and what does it cost

**Branch:** `research/redis-infra-cost` · **Map:** [#31 Wayfinder — Redis caching plan](https://github.com/Tomiwa-Jegede/trend-tribe/issues/31) · **Ticket:** [#35 Research — Where would Redis run and what does it cost](https://github.com/Tomiwa-Jegede/trend-tribe/issues/35) · **Date:** 2026-09-13

> Plain English, no code. Live pricing fetched 2026-09-13 from Render and Upstash docs. Railway numbers flagged as estimate where docs don't list a fixed Redis SKU.

## 1-sentence gist

For Trend Tribe on Render, Render Key Value (same-region, private network) is the simplest — $0 free or $10/mo Starter is enough at low traffic. Upstash is the cheapest $0 cross-cloud alternative with TLS and generous free tier. Railway only makes sense if you move the whole stack off Render. Staying without Redis is fine at low traffic if you add a tiny in-memory fallback and fix the feed/count queries.

---

## What was checked

- Render docs: Key Value intro + plans + free limits (docs.render.com/key-value, /free, /compute-plans, /pricing)
- Upstash docs: pricing page + billing/limits (upstash.com/pricing/redis + upstash.com/docs/redis/overall/billing)
- Railway docs: usage-based pricing (railway.com/pricing, docs.railway.com/guides/redis-*)
- Trend Tribe hot paths from [#32 slow-query audit](https://github.com/Tomiwa-Jegede/trend-tribe/issues/32): feed 2–4 DB reads/request, `sort=random` 4 trips, unread counts ~16 counts/min/user idle, stats counts every 30s
- Repo region: **Render dashboard → your Web Service → Region** (e.g. Oregon/Frankfurt/Singapore — must be checked; all latency advice below assumes Key Value in same region as API + Postgres)

> Not measured: real Render p95 latency, actual qps, exact `REDIS_URL` value for Trend Tribe — shape below is per docs.

---

## Short table — option, host, cost, pros/cons

| Option | Host | Cost at low traffic | Pros (plain English) | Cons (plain English) |
|---|---|---|---|---|
| **A — Render Key Value Free** | Render (Valkey 8, same region as API/Postgres) | **$0/mo** — 25 MB RAM, 50 connections, single instance per workspace [docs.render.com/free](https://docs.render.com/free), [pricing](https://render.com/pricing) | Zero extra bill. Private network = fastest (~1–2 ms) — no public internet. One-click from dashboard, `REDIS_URL` auto-wired. No egress fee. | **No disk save** — all data wiped on restart/upgrade [docs.render.com/key-value#data-persistence](https://docs.render.com/key-value#data-persistence). 25 MB fills fast if you cache big JSON. Not for production (Render says free not for prod). 50 connections caps concurrent dynos. |
| **B — Render Key Value Starter (recommended if paying)** | Render | **$10/mo** — 256 MB, 250 connections, disk-backed persistence off-by-default but available [pricing](https://render.com/pricing), [compute-plans](https://docs.render.com/compute-plans) | Still same-region private network. **Persistence = data survives restart** (Journal+Snapshot or Snapshot-only) [key-value#data-persistence](https://docs.render.com/key-value#data-persistence). Enough for feed cache: 256 MB holds ~thousands of feed pages (each 10–50 KB). No egress, no TLS hop for internal URL. Easy eviction policy `allkeys-lru` for cache. | $10/mo even idle. Need to pick persistence mode (Off recommended for cache, Journal+Snapshot for jobs). Upgrades cause 1–2 min downtime and can lose data if mode is Off. Next step Standard (1 GB) is $32/mo if 256 MB fills. |
| **C — Upstash Redis Free (best $0 cross-cloud)** | Upstash (AWS/GCP global, pick region nearest Render) | **$0/mo** — 256 MB, **500K commands/mo**, 10 GB bandwidth, 1 DB [upstash.com/pricing/redis](https://upstash.com/pricing/redis), [billing](https://upstash.com/docs/redis/overall/billing) | True managed Redis outside Render. 500K cmds ≈ 11/min nonstop; low traffic (e.g. 200 users browsing = ~30–80K cmds/mo) fits easily. No server to run. TLS yes, REST API for edge functions. Persistence yes. Idle costs $0. | Public internet hop → ~5–30 ms vs ~1 ms private. Needs `rediss://` TLS + auth. Free has no IP allowlist/ACL, no multi-zone HA. If you exceed 500K cmds you move to pay-as-you-go $0.20/100K cmds [upstash pricing](https://upstash.com/pricing/redis). Must choose region close to Render (e.g. Render `Frankfurt` → Upstash `eu-west-1`, Render `Oregon` → `us-west-2`) or latency doubles. |
| **D — Upstash Pay-as-you-go / Fixed** | Upstash | **Pay-as-you-go: ~$0.40–$4/mo at low traffic** ($0.20/100K cmds + $0.25/GB storage beyond 1 GB free, 200 GB bandwidth free) · **Fixed 250 MB: $10/mo flat, unlimited cmds** [upstash pricing](https://upstash.com/pricing/redis) | Scales by commands, not RAM: good if cache is small but chatty. Fixed $10 gives peace of mind (no per-command bill). Same TLS/persistence as free but adds IP allowlist, ACL. | Pay-as-you-go bill grows with traffic (burst month could jump). Fixed is same price as Render Starter but still over public internet (slower). Both need external secret management. |
| **E — Railway Redis template** | Railway (own infra, usage-billed) | **~$3–$10/mo for 256 MB–1 GB** — Railway bills $10/GB RAM/mo + $20/vCPU/mo + $0.15/GB volume, per-second [railway.com/pricing](https://railway.com/pricing) · **Estimate — Railway has no fixed Redis SKU**; Hobby plan $5/mo includes $5 credit, Pro $20/mo includes $20 credit | Cheapest raw RAM ($10/GB) if you already run app on Railway (one bill/dashboard). Private networking if whole stack moves to Railway. | **Worst fit while API stays on Render** — cross-provider = public internet + egress ($0.05/GB) + ~20–50 ms latency and you pay for two providers. No persistence unless you add a Volume ($0.15/GB/mo). Not HA. Only worth it if you migrate Trend Tribe off Render entirely. |
| **F — Stay without Redis (fallback)** | No Redis — Postgres + Node in-memory | **$0/mo** | No infra, no secret, no TLS to debug. Postgres at low traffic (few hundred users, feed 2–4 reads/request) handles it. Already has `stats` HTTP `max-age=60`. Can add **per-process memory cache** (`node-cache` 30–60 s, 20–50 MB cap, fail-open on miss) as zero-cost first step. | Cache not shared across deploys/instances — each dyno recomputes. Restart wipes it. Doesn't reduce DB counts under poll bursts (unread 16/min/user) without also fixing queries (fix Navbar `gigs limit 50` → `count`, remove N+1 in `getConversations`, add `Listing` composite index). Under traffic spikes DB CPU will spike first. |

---

## Details the table summarizes

### Free tier limits (from docs)

- **Render Free Key Value:** 25 MB RAM, 50 connections, 1 instance/workspace, in-memory only (data lost on restart/deploy) [free#free-key-value](https://docs.render.com/free#free-key-value) — not for prod.
- **Upstash Free:** 256 MB, 500K commands/month, 10 GB bandwidth, 10K cmds/sec, 1 DB [pricing](https://upstash.com/pricing/redis) — confirmed via `upstash.com/docs/redis/overall/billing`.
- **Railway:** no fixed Redis free tier. Closest is platform Free plan $1/mo credit or Hobby $5/mo includes $5 usage credit — Redis memory billed at $10/GB/mo metered per second [railway pricing](https://railway.com/pricing). So a 512 MB Redis ≈ $5/mo RAM continuously.

### Paid starting price (fetched live)

- **Render:** Starter (256 MB) **$10/mo**, Standard (1 GB) **$32/mo**, Pro (5 GB) **$135/mo** [render.com/pricing#key-value](https://render.com/pricing#key-value).
- **Upstash:** Pay-as-you-go **$0.20/100K commands**, Fixed 250 MB **$10/mo**, Fixed 1 GB **$20/mo** [upstash pricing](https://upstash.com/pricing/redis).
- **Railway estimate:** Starter-like Redis on Hobby lands at **$5–$10/mo** effective (credit offsets RAM) — flagged estimate — real bill = `GB × $10 + vCPU × $20 + volume × $0.15` per month.

### Region / latency to Render Postgres + API

- **Render Key Value:** pick **same region as your Render Postgres + Web Service** (Dashboard → Services → Region). Internal `redis://red-xxxxx:6379` uses private network, <2 ms, no TLS hop. External `rediss://` needs IP allowlist + TLS [key-value#connect](https://docs.render.com/key-value#connect-to-your-key-value-instance). This is the only option with private-network latency.
- **Upstash:** choose the AWS/GCP region that matches Render (e.g. `Frankfurt` → `eu-west-1`, `Oregon` → `us-west-2`, `Singapore` → `ap-southeast-1`). TLS `rediss://` over public internet ≈ 5–30 ms depending on distance. Upstash also offers global read replicas (+$5/region on Fixed) but overkill for cache.
- **Railway:** Railway regions are separate (US West etc.). From Render → Railway is cross-cloud public internet — higher latency and egress cost. Only low-latency if you colocate API + Postgres on Railway too.

> Trend Tribe's actual Render region **must be verified in the dashboard** before provisioning — the doc above is not guessing it.

### Persistence

- **Render paid:** `Off` (fastest, data lost on restart), `Snapshot only`, `Journal + Snapshot` (safest, keeps last ~1 s of writes) — paid only [key-value#data-persistence](https://docs.render.com/key-value#data-persistence). For cache use `Off` or `Snapshot only` to maximize write perf.
- **Upstash:** persistence yes on all tiers (including free) [pricing](https://upstash.com/pricing/redis).
- **Railway:** persistence only if you attach a Volume and configure `appendonly yes` / RDB — otherwise memory-only.

### TLS

- **Render internal URL:** `redis://` unauthenticated by default on private network (can optionally require auth) [key-value#requiring-auth](https://docs.render.com/key-value#requiring-auth). External URL is `rediss://` with TLS + password and needs IP allowlist.
- **Upstash:** always TLS — `rediss://default:PASSWORD@HOST:6379` plus optional REST API with token. Encryption at rest requires Prod Pack on paid.
- **Railway:** `redis://` or `rediss://` depending on template; TLS typically on private network if configured.

### Env var shape — what the app would need

Single var is enough for `ioredis` or `node-redis`:

```bash
# Render Key Value — internal (same region) — fastest
REDIS_URL=redis://red-xxxxxxxxxxxxxxxx:6379
# Render Key Value — external (dev or cross-region)
REDIS_URL=rediss://default:PASSWORD@oregon-redis.render.com:6379

# Upstash — TLS always
REDIS_URL=rediss://default:PASSWORD@us1-xxxx.upstash.io:6379
# Upstash REST (alternative for edge/serverless, not for ioredis)
UPSTASH_REDIS_REST_URL=https://us1-xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXX...

# Railway — from service variables
REDIS_URL=redis://default:PASSWORD@redis.railway.internal:6379
# or public host: redis://default:PASSWORD@monorail.proxy.rlwy.net:PORT
```

App code: `new Redis(process.env.REDIS_URL)` (ioredis) or `createClient({ url: process.env.REDIS_URL })` (node-redis). No other env needed at low traffic. Use one connection singleton, lazy-connect, and fail-open (on Redis error, fall through to Postgres — don't 500).

### Monthly cost at low traffic (plain-English math)

Assumptions from [#32 audit](https://github.com/Tomiwa-Jegede/trend-tribe/issues/32): 100–300 daily active browsers, each feed page 2–4 cacheable cmds, few thousand feed hits/day, unread counts ~10–30K cmds/mo idle. Budget ~30K–100K Redis cmds/mo low traffic, bursts to 200K.

- **Render Free** $0 — fits but data wiped on deploy; fine for dev preview only.
- **Render Starter $10** — fixes persistence/capacity; total infra delta = $10/mo regardless of cmds.
- **Upstash Free $0** — 256 MB + 500K cmds covers low traffic with headroom; no bill until you 5× traffic.
- **Upstash PAYG** at 100K cmds = $0.20, at 300K cmds = $0.60 (+ storage $0 if <1 GB). So $0–$2/mo typical low traffic.
- **Upstash Fixed $10** — flat, same as Render Starter but over internet.
- **Railway** at 256 MB continuous ≈ $2.56 RAM + ~$1 CPU ≈ $3–$6/mo actual meter, offset by Hobby credit → **$5/mo floor** if API stays on Render you pay this on top of Render bill, so effectively $5+ extra.
- **No Redis** $0 — DB absorbs counts; Postgres Basic-256mb on Render is $6/mo or Basic-1gb $19/mo [pricing](https://render.com/pricing) if you need headroom. In-memory `node-cache` fallback costs $0 but is per-instance.

> At low traffic, any $0 option (Render Free for staging, Upstash Free for prod path, or no Redis + in-memory) is cheapest. First paid step is **$10/mo** on either Render or Upstash — they're priced identically at the entry.

### Fallback if we stay without Redis

DB still handles load at today's campus scale (low hundreds concurrent). But you keep the hammer from [#32](https://github.com/Tomiwa-Jegede/trend-tribe/pull/32):

- **Need a local in-memory fallback? Yes, tiny one.** A per-process cache (e.g. `node-cache` or `lru-cache`, 30–60 s TTL, max 500 keys, ~20 MB) cuts 60–80% of repeat feed/stats/gig counts without any infra. It's per-instance, not shared, and wipes on deploy — acceptable warm-up cost. Wrap with `try/catch`, fail-open to Postgres.
- **What stays uncached:** wallet/escrow, chat thread messages, presence, payment webhooks, booking state — always hit Postgres fresh (same as Redis plan).
- **Cheapest wins before any Redis bill:**
  1. Change `Navbar.jsx:129` — fetch `gig.count` not `gig list 50`.
  2. HTTP cache `GET /stats` already has `max-age=60` — extend and add `ETag`/`stale-while-revalidate`.
  3. Fix `getConversations` N+1 (batch `_count`) — Redis would hide it, fixing removes it.
  4. Add `Listing` composite index covering `isAvailable, category, subcategory, condition, price, boostedUntil, createdAt` — check `EXPLAIN ANALYZE` first.
- **Risk if traffic spikes without Redis:** Postgres counts (feed `count` + `findMany`, unread counts) become the limiter before CPU; free Postgres (30-day limit, 1 GB, no backups) would cap before Redis does. Moving to paid Postgres ($6–$19/mo) matters before Redis at scale.

---

## Recommendation (no code yet — owner sign-off)

1. **For prod plan:** budget **$0 with Upstash Free** or **$10 with Render Starter** — pick one. If Trend Tribe stays on Render long-term, Render Starter in same region is simplest (private network, no egress). If you want $0 prod + easy migration, Upstash Free with `rediss://` is the drop-in.
2. **For preview/dev:** Render Free Key Value is fine (just accept wipe on restart).
3. **Regardless:** add a 30 s in-memory `node-cache` fallback now (zero infra) and fix the three query fixes above — that's the actual low-cost first win before any Redis bill.

---

## Sources

- Render Key Value docs — Valkey, private network, internal vs external URLs, eviction, persistence modes: https://docs.render.com/key-value
- Render Free limits — Key Value in-memory only, single instance: https://docs.render.com/free#free-key-value
- Render compute plans — Key Value RAM/connection limits (free 25 MB/50, 256mb/250, 1g/1000…): https://docs.render.com/compute-plans#all-plans
- Render pricing — Key Value table (Free $0, Starter $10, Standard $32, Pro $135…): https://render.com/pricing#key-value
- Upstash Redis pricing — free 256 MB/500K cmds, PAYG $0.20/100K, Fixed tiers, bandwidth/storage notes: https://upstash.com/pricing/redis (fetched 2026-09-13)
- Upstash billing docs — free tier limits table, command counting: https://upstash.com/docs/redis/overall/billing
- Railway pricing — $10/GB RAM, $20/vCPU, volume/egress, Hobby $5 includes $5 credit, Pro $20: https://railway.com/pricing
- Trend Tribe slow-query audit (this map, same doc set): `research/redis-slow-queries` branch + issue #32

> Live pricing links above were reachable 2026-09-13. If a link moves, re-fetch the same pages — Render pricing changes are announced under https://render.com/pricing and docs under https://docs.render.com. Railway Redis has no fixed SKU — its cost is derived from usage rates, flagged as estimate.
