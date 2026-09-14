// src/routes/analytics.routes.js — Admin analytics (money, funnel, supply, growth, search)
const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../db");

const router = express.Router();
router.use(protect, requireAdmin);

// ─── Money: token economy ─────────────────────────────────────
router.get("/money", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000);

    const [totalPurchases, successfulPurchases, revenue, recentPurchases, balanceStats] = await Promise.all([
      prisma.tokenPurchase.count(),
      prisma.tokenPurchase.count({ where: { status: "SUCCESS" } }),
      prisma.tokenPurchase.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true, quantity: true } }),
      prisma.tokenPurchase.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.user.aggregate({ _sum: { tokenBalance: true }, _avg: { tokenBalance: true } }),
    ]);

    // Daily revenue last 7 days
    const daily = await prisma.$queryRaw`
      SELECT DATE("createdAt") as day, SUM(amount)/100.0 as revenue, SUM(quantity) as tokens, COUNT(*) as count
      FROM "TokenPurchase" WHERE status='SUCCESS' AND "createdAt" >= ${since}
      GROUP BY day ORDER BY day ASC
    `;

    return res.json({
      totalPurchases,
      successfulPurchases,
      failedPurchases: totalPurchases - successfulPurchases,
      revenueNaira: (revenue._sum.amount || 0) / 100,
      tokensSold: revenue._sum.quantity || 0,
      avgTokensPerPurchase: successfulPurchases ? ((revenue._sum.quantity || 0) / successfulPurchases).toFixed(1) : 0,
      totalTokenBalance: balanceStats._sum.tokenBalance || 0,
      avgBalance: Number((balanceStats._avg.tokenBalance || 0).toFixed(1)),
      daily,
      recentPurchases: recentPurchases.slice(0, 20),
    });
  } catch (err) {
    console.error("[ANALYTICS MONEY ERROR]", err);
    return res.status(500).json({ error: "Failed to load money analytics" });
  }
});

// ─── Funnel: view → favorite → contact ───────────────────────
router.get("/funnel", async (req, res) => {
  try {
    const [totalListings, totalFavorites, totalContactViews, totalMessages] = await Promise.all([
      prisma.listing.count({ where: { isAvailable: true } }),
      prisma.favorite.count(),
      prisma.contactView.count(),
      prisma.message.count(),
    ]);

    const topByFunnel = await prisma.listing.findMany({
      take: 10,
      orderBy: { contactViews: "desc" },
      select: { id: true, slug: true, title: true, contactViews: true, _count: { select: { favorites: true } } },
    });

    const funnel = [
      { step: "Active Listings", count: totalListings },
      { step: "Favorites", count: totalFavorites },
      { step: "Contact Views", count: totalContactViews },
      { step: "Messages (inbox)", count: totalMessages },
    ];

    return res.json({ funnel, topByFunnel });
  } catch (err) {
    console.error("[ANALYTICS FUNNEL ERROR]", err);
    return res.status(500).json({ error: "Failed to load funnel" });
  }
});

// ─── Supply: category / price / ghost ───────────────────────
router.get("/supply", async (req, res) => {
  try {
    const byCategory = await prisma.listing.groupBy({ by: ["category"], where: { isAvailable: true }, _count: true });
    const byCondition = await prisma.listing.groupBy({ by: ["condition"], where: { isAvailable: true }, _count: true });
    const priceBuckets = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN price < 5000 THEN '0-5k'
          WHEN price < 10000 THEN '5k-10k'
          WHEN price < 20000 THEN '10k-20k'
          WHEN price < 50000 THEN '20k-50k'
          ELSE '50k+'
        END as bucket, COUNT(*) as count
      FROM listings WHERE "isAvailable"=true
      GROUP BY bucket ORDER BY MIN(price)
    `;
    const ghost = await prisma.listing.count({ where: { isAvailable: true, favorites: { none: {} } } });
    const boosted = await prisma.listing.count({ where: { boostedUntil: { gt: new Date() } } });

    return res.json({ byCategory, byCondition, priceBuckets, ghost, boosted });
  } catch (err) {
    console.error("[ANALYTICS SUPPLY ERROR]", err);
    return res.status(500).json({ error: "Failed to load supply" });
  }
});

// ─── Growth: DAU/WAU/MAU, retention, school ─────────────────
router.get("/growth", async (req, res) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau, bySchool, recentUsers] = await Promise.all([
      prisma.contactView.groupBy({ by: ["viewerId"], where: { createdAt: { gte: dayAgo } } }).then(r => r.length),
      prisma.contactView.groupBy({ by: ["viewerId"], where: { createdAt: { gte: weekAgo } } }).then(r => r.length),
      prisma.contactView.groupBy({ by: ["viewerId"], where: { createdAt: { gte: monthAgo } } }).then(r => r.length),
      prisma.user.groupBy({ by: ["school"], _count: true, orderBy: { _count: { school: "desc" } }, take: 10 }),
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, username: true, school: true, role: true, createdAt: true } }),
    ]);

    // Daily signups last 14 days
    const signups = await prisma.$queryRaw`
      SELECT DATE("createdAt") as day, COUNT(*) as count FROM users WHERE "createdAt" >= ${new Date(now - 14 * 24 * 60 * 60 * 1000)} GROUP BY day ORDER BY day ASC
    `;

    return res.json({ dau, wau, mau, bySchool, signups, recentUsers });
  } catch (err) {
    console.error("[ANALYTICS GROWTH ERROR]", err);
    return res.status(500).json({ error: "Failed to load growth" });
  }
});

// ─── Search: top queries, zero results ──────────────────────
router.get("/search", async (req, res) => {
  try {
    const topQueries = await prisma.searchLog.groupBy({ by: ["query"], _count: true, _avg: { results: true }, orderBy: { _count: { query: "desc" } }, take: 20 });
    const zeroResults = await prisma.searchLog.findMany({ where: { results: 0 }, orderBy: { createdAt: "desc" }, take: 20 });
    const recent = await prisma.searchLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    const dailySearches = await prisma.$queryRaw`SELECT DATE("createdAt") as day, COUNT(*) as count FROM search_logs WHERE "createdAt" >= NOW() - INTERVAL '14 days' GROUP BY day ORDER BY day ASC`;
    return res.json({ topQueries, zeroResults, recent, dailySearches });
  } catch (err) {
    console.error("[ANALYTICS SEARCH ERROR]", err);
    return res.status(500).json({ error: "Failed to load search analytics" });
  }
});

// ─── Trust: reports ──────────────────────────────────────────
router.get("/trust", async (req, res) => {
  try {
    const byReason = await prisma.report.groupBy({ by: ["reason"], _count: true });
    const pending = await prisma.report.count({ where: { status: "PENDING" } });
    const ignored = await prisma.report.count({ where: { status: "IGNORED" } });
    return res.json({ byReason, pending, ignored });
  } catch (err) {
    console.error("[ANALYTICS TRUST ERROR]", err);
    return res.status(500).json({ error: "Failed" });
  }
});

// ─── PostHog: product analytics via HogQL (server-proxied, ADMIN only) ──
router.get("/posthog", async (req, res) => {
  try {
    const config = require("../config/env");
    const { apiKey, projectId, host } = config.posthog || {};
    if (!apiKey) {
      return res.status(200).json({
        configured: false,
        message: "POSTHOG_API_KEY not set. Add phx_ personal API key to backend/.env as POSTHOG_API_KEY to enable PostHog stats.",
        projectId,
        host,
      });
    }

    const fetchHogQL = async (hogql) => {
      const r = await fetch(`${host}/api/projects/${projectId}/query/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detail || j?.error || `PostHog ${r.status}`);
      return j;
    };

    // 30-day window queries — all use $pageview + person props from identify()
    const qPageviews7d = `SELECT count() as c FROM events WHERE event = '$pageview' AND timestamp > now() - interval 7 day`;
    const qPageviews30d = `SELECT count() as c FROM events WHERE event = '$pageview' AND timestamp > now() - interval 30 day`;
    const qUsers30d = `SELECT count(DISTINCT person_id) as c FROM events WHERE timestamp > now() - interval 30 day AND person_id IS NOT NULL`;
    const qTopPages = `SELECT properties.$current_url as url, count() as c FROM events WHERE event = '$pageview' AND timestamp > now() - interval 7 day GROUP BY url ORDER BY c DESC LIMIT 10`;
    const qDaily = `SELECT toDate(timestamp) as day, count() as c FROM events WHERE event = '$pageview' AND timestamp > now() - interval 14 day GROUP BY day ORDER BY day ASC`;
    const qAutocapture = `SELECT event, count() as c FROM events WHERE timestamp > now() - interval 7 day GROUP BY event ORDER BY c DESC LIMIT 10`;

    const [r7, r30, rUsers, rTop, rDaily, rEvents] = await Promise.all([
      fetchHogQL(qPageviews7d).catch((e) => ({ results: [[0]], error: e.message })),
      fetchHogQL(qPageviews30d).catch((e) => ({ results: [[0]], error: e.message })),
      fetchHogQL(qUsers30d).catch((e) => ({ results: [[0]], error: e.message })),
      fetchHogQL(qTopPages).catch((e) => ({ results: [], error: e.message })),
      fetchHogQL(qDaily).catch((e) => ({ results: [], error: e.message })),
      fetchHogQL(qAutocapture).catch((e) => ({ results: [], error: e.message })),
    ]);

    const extract = (r) => (r?.results?.[0]?.[0] ?? 0);
    const hasError = [r7, r30, rUsers, rTop, rDaily, rEvents].some((r) => r.error);

    return res.json({
      configured: true,
      projectId,
      host,
      pageviews7d: Number(extract(r7)),
      pageviews30d: Number(extract(r30)),
      distinctUsers30d: Number(extract(rUsers)),
      topPages: (rTop.results || []).map(([url, c]) => ({ url, count: Number(c) })),
      daily: (rDaily.results || []).map(([day, c]) => ({ day, count: Number(c) })),
      topEvents: (rEvents.results || []).map(([event, c]) => ({ event, count: Number(c) })),
      ...(hasError ? { _warning: "Some PostHog queries failed — check project ID / API key scope", _errors: [r7.error, r30.error, rUsers.error, rTop.error, rDaily.error, rEvents.error].filter(Boolean) } : {}),
    });
  } catch (err) {
    console.error("[ANALYTICS POSTHOG ERROR]", err.message);
    return res.status(502).json({ error: "Failed to load PostHog analytics", details: err.message });
  }
});

// ─── PostHog replays (ADMIN only, server-proxied) ───────────────
router.get("/posthog/replays", async (req, res) => {
  try {
    const config = require("../config/env");
    const { apiKey, projectId, host } = config.posthog || {};
    if (!apiKey) {
      return res.status(200).json({ configured: false, message: "POSTHOG_API_KEY not set", projectId, host, replays: [] });
    }
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    // PostHog API uses us.posthog.com for API even when ingestion is us.i.posthog.com
    const url = `${host}/api/projects/${projectId}/session_recordings/?limit=${limit}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.detail || j?.error || `PostHog ${r.status}`);
    // j.results is array of recordings: {id, distinct_id, start_time, end_time, duration, viewed, person, ...}
    const replays = (j.results || []).map((rec) => ({
      id: rec.id || rec.session_id,
      distinct_id: rec.distinct_id,
      start_time: rec.start_time,
      end_time: rec.end_time,
      duration: rec.recording_duration || rec.duration || null,
      viewed: rec.viewed,
      person: rec.person ? { id: rec.person.id, properties: rec.person.properties } : null,
      start_url: rec.start_url || rec.first_url || null,
    }));
    return res.json({ configured: true, projectId, host, replays, next: j.next || null });
  } catch (err) {
    console.error("[ANALYTICS POSTHOG REPLAYS ERROR]", err.message);
    return res.status(502).json({ error: "Failed to load replays", details: err.message });
  }
});

// ─── AI: Jegede credits & usage ───────────────────────────────
router.get("/ai", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const FREE_LIMIT_GUEST = 10;
    const FREE_LIMIT_USER = 20;
    const GEMINI_DAILY_LIMIT = 1500;
    const [freeTodayAgg, totalFreeAgg, totalPaidSessions, tokensSpentAgg, recentFree, geminiToday] = await Promise.all([
      prisma.aiFreeUsage.aggregate({ where: { date: today }, _sum: { count: true } }),
      prisma.aiFreeUsage.aggregate({ _sum: { count: true } }),
      prisma.frederickSession.count(),
      prisma.frederickSession.aggregate({ _sum: { cost: true } }),
      prisma.aiFreeUsage.findMany({ orderBy: { updatedAt: "desc" }, take: 20 }),
      prisma.geminiLog.findUnique({ where: { date: today } }),
    ]);
    const freeToday = freeTodayAgg._sum.count || 0;
    const totalFree = totalFreeAgg._sum.count || 0;
    const tokensSpent = tokensSpentAgg._sum.cost || 0;
    const geminiTodayCount = geminiToday?.count || 0;
    const geminiRemaining = Math.max(0, GEMINI_DAILY_LIMIT - geminiTodayCount);
    const geminiKeySet = !!process.env.GEMINI_API_KEY;
    return res.json({
      today,
      free: {
        limitGuest: FREE_LIMIT_GUEST,
        limitUser: FREE_LIMIT_USER,
        usedToday: freeToday,
        totalFree,
        recentFree,
        note: "Each user/IP gets own free limit — one user's use does not affect another.",
      },
      paid: {
        sessions: totalPaidSessions,
        tokensSpent,
      },
      gemini: {
        keySet: geminiKeySet,
        dailyLimit: GEMINI_DAILY_LIMIT,
        usedToday: geminiTodayCount,
        remaining: geminiRemaining,
        percentUsed: Number(((geminiTodayCount / GEMINI_DAILY_LIMIT) * 100).toFixed(1)),
        note: "Gemini free tier: 60 req/min, 1500/day, 1M tokens/day. Resets midnight Pacific. Track via Google Cloud Console → APIs → Generative AI.",
      },
    });
  } catch (err) {
    console.error("[ANALYTICS AI ERROR]", err);
    return res.status(500).json({ error: "Failed to load AI analytics" });
  }
});

module.exports = router;
