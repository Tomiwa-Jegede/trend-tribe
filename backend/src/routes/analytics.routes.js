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

// ─── AI: Jegede credits & usage ───────────────────────────────
router.get("/ai", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const FREE_LIMIT_GUEST = 10;
    const FREE_LIMIT_USER = 20;
    const [freeTodayAgg, totalFreeAgg, totalPaidSessions, tokensSpentAgg, recentFree] = await Promise.all([
      prisma.aiFreeUsage.aggregate({ where: { date: today }, _sum: { count: true } }),
      prisma.aiFreeUsage.aggregate({ _sum: { count: true } }),
      prisma.frederickSession.count(),
      prisma.frederickSession.aggregate({ _sum: { cost: true } }),
      prisma.aiFreeUsage.findMany({ orderBy: { updatedAt: "desc" }, take: 20 }),
    ]);
    const freeToday = freeTodayAgg._sum.count || 0;
    const totalFree = totalFreeAgg._sum.count || 0;
    const tokensSpent = tokensSpentAgg._sum.cost || 0;
    const geminiKeySet = !!process.env.GEMINI_API_KEY;
    return res.json({
      today,
      free: {
        limitGuest: FREE_LIMIT_GUEST,
        limitUser: FREE_LIMIT_USER,
        usedToday: freeToday,
        totalFree,
        recentFree,
      },
      paid: {
        sessions: totalPaidSessions,
        tokensSpent,
      },
      gemini: {
        keySet: geminiKeySet,
        // Gemini free quota is per Google Cloud, not queryable via API — we show our own usage
        note: "Gemini free tier: 60 req/min, 1500/day. Track via Google Cloud Console → APIs → Generative AI.",
      },
    });
  } catch (err) {
    console.error("[ANALYTICS AI ERROR]", err);
    return res.status(500).json({ error: "Failed to load AI analytics" });
  }
});

module.exports = router;
