// src/routes/jegede.routes.js — Jegede: admin Data Analyst & strategist
// Not a personal shopper (Frederick). Jegede reads real analytics and tells you
// where we are, what's working, and the ONE next move.
// Trigger: POST /api/jegede/update with body { message: "update" } (case-insensitive) or empty -> always returns briefing.
// ADMIN ONLY.

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../db");

const router = express.Router();
router.use(protect, requireAdmin);

// ─── Build real snapshot from DB — every number is a real query ───────
async function buildSnapshot() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalListings,
    activeListings,
    newUsers7d,
    newListings7d,
    totalFavorites,
    newFavorites7d,
    totalContactViews,
    newContactViews7d,
    coldListings,
    boosted,
    pendingReports,
    trustedStats,
    moneyAgg,
    moneyRecent,
    balanceStats,
    topContacted,
    topFavorited,
    byCategory,
    dau,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { isAvailable: true } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.favorite.count(),
    prisma.favorite.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.contactView.count(),
    prisma.contactView.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.listing.count({ where: { isAvailable: true, favorites: { none: {} } } }),
    prisma.listing.count({ where: { boostedUntil: { gt: new Date() } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.groupBy({ by: ["reason"], _count: true }),
    prisma.tokenPurchase.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true, quantity: true } }),
    prisma.tokenPurchase.count({ where: { status: "SUCCESS", createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.aggregate({ _sum: { tokenBalance: true }, _avg: { tokenBalance: true } }),
    prisma.listing.findMany({ orderBy: { contactViews: "desc" }, take: 3, select: { id: true, title: true, contactViews: true } }),
    prisma.listing.findMany({ orderBy: { favorites: { _count: "desc" } }, take: 3, select: { id: true, title: true, _count: { select: { favorites: true } } } }),
    prisma.listing.groupBy({ by: ["category"], where: { isAvailable: true }, _count: true }),
    prisma.contactView.groupBy({ by: ["viewerId"], where: { createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } }).then(r=>r.length),
  ]);

  const revenueNaira = (moneyAgg._sum.amount || 0) / 100;
  const tokensSold = moneyAgg._sum.quantity || 0;
  const avgBalance = Number((balanceStats._avg.tokenBalance || 0).toFixed(1));
  const totalBalance = balanceStats._sum.tokenBalance || 0;

  // Funnel rates
  const favRate = activeListings ? (totalFavorites / activeListings).toFixed(2) : 0;
  const contactRate = activeListings ? (totalContactViews / activeListings).toFixed(2) : 0;
  const contact7dRate = activeListings ? (newContactViews7d / Math.max(1, activeListings)).toFixed(2) : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals: { totalUsers, totalListings, activeListings, totalFavorites, totalContactViews, pendingReports, coldListings, boosted },
    growth: { newUsers7d, newListings7d, newFavorites7d, newContactViews7d, dau },
    funnel: { favRate, contactRate, contact7dRate },
    money: { revenueNaira, tokensSold, recentSuccess7d: moneyRecent, totalBalance, avgBalance },
    byCategory: byCategory.map(c=>({ category: c.category, count: c._count })),
    topContacted: topContacted.map(l=>({ id:l.id, title:l.title, views:l.contactViews })),
    topFavorited: topFavorited.map(l=>({ id:l.id, title:l.title, favs:l._count.favorites })),
    trust: { pendingReports, byReason: trustedStats },
    window: { sevenDaysAgo: sevenDaysAgo.toISOString(), thirtyDaysAgo: thirtyDaysAgo.toISOString() },
  };
}

// ─── Rule-based fallback briefing (no Gemini) — simple English ─────────
function fallbackBriefing(s) {
  const lines = [];
  // Diagnosis priority: trust > money > funnel > growth
  let diagnosis = "";
  let nextMove = "";
  let risks = [];

  if (s.trust.pendingReports > 3) {
    diagnosis = `Trust needs attention — ${s.trust.pendingReports} reports are still pending.`;
    nextMove = `Clear pending reports in /admin/reports today. Buyers trust drops fast when reports sit.`;
    risks.push(`Pending reports: ${s.trust.pendingReports}`);
  } else if (s.growth.newUsers7d === 0 && s.growth.newListings7d === 0) {
    diagnosis = `Growth is flat — no new users or listings in 7 days.`;
    nextMove = `Push one listing to WhatsApp broadcast or daily email to bring sellers back.`;
    risks.push("No growth in 7 days");
  } else if (parseFloat(s.funnel.contactRate) < 0.5) {
    diagnosis = `People are browsing but not contacting — contact rate is ${s.funnel.contactRate} per active listing.`;
    nextMove = `Check if top listings have clear photos and WhatsApp set. Boost one strong listing to test if contact rate lifts.`;
    risks.push(`Low contact rate: ${s.funnel.contactRate}`);
  } else if (s.money.revenueNaira === 0) {
    diagnosis = `No paid tokens yet — marketplace is free and active but not making money.`;
    nextMove = `Test a boost offer: 1 token for 24h Featured on a top item and see if sellers buy.`;
    risks.push("Zero token revenue");
  } else {
    diagnosis = `Marketplace is healthy — ${s.totals.activeListings} active items, ${s.growth.newContactViews7d} contacts in 7 days.`;
    nextMove = `Double down on what works: boost the top-contacted item and keep ghost listings fresh.`;
  }

  if (s.totals.coldListings > s.totals.activeListings * 0.4) risks.push(`${s.totals.coldListings} cold listings (0 favs) — they make the feed look empty`);
  if (s.money.avgBalance < 1) risks.push(`Average token balance is ${s.money.avgBalance} — many users are near zero`);

  const snapshot = `We have ${s.totals.totalUsers} users and ${s.totals.activeListings} active listings (out of ${s.totals.totalListings} total). In the last 7 days: ${s.growth.newUsers7d} new users, ${s.growth.newListings7d} new listings, ${s.growth.newContactViews7d} contact clicks.`;

  const progress = `Funnel: ${s.totals.totalFavorites} total favorites (${s.funnel.favRate} per listing) and ${s.totals.totalContactViews} contact views (${s.funnel.contactRate} per listing). Money: ₦${s.money.revenueNaira.toLocaleString()} from ${s.money.tokensSold} tokens sold, ${s.money.recentSuccess7d} paid purchases in 7 days. Avg token balance is ${s.money.avgBalance}.`;

  return {
    snapshot,
    progress,
    funnelInsight: `Contact rate ${s.funnel.contactRate} per listing (${s.funnel.contact7dRate} in last 7d). Top contacted: ${s.topContacted.map(t=>`${t.title} (${t.views})`).join(", ") || "none yet"}.`,
    moneyInsight: `Revenue ₦${s.money.revenueNaira} · Tokens ${s.money.tokensSold} · Recent paid ${s.money.recentSuccess7d} in 7d.`,
    trustInsight: `${s.trust.pendingReports} pending reports. ${s.trust.byReason.map(r=>`${r.reason}:${r._count}`).join(", ") || "no reports"}.`,
    diagnosis,
    nextMove,
    risks: risks.length ? risks : ["No major risk right now"],
    table: `By category: ${s.byCategory.map(c=>`${c.category} ${c.count}`).join(", ") || "none"}. Boosted now: ${s.totals.boosted}.`,
  };
}

// ─── Try Gemini for richer wording, but always grounded in real data ──
async function geminiBriefing(s) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const { askGemini } = require("../utils/gemini");
    const prompt = `You are Jegede, a professional Data Analyst and Strategist for Trend Tribe admin. You are NOT a personal shopper like Frederick. Your job is to read real marketplace numbers and give a short, simple-English briefing for a busy founder.

Data (all numbers are real DB counts, do not invent):
${JSON.stringify(s, null, 2)}

Task: When the admin says "update", explain in SIMPLE English:
- snapshot: 2 sentences, where we are now (users, active listings, 7d growth)
- progress: funnel (favorites per listing, contact rate) and money (revenue, tokens, avg balance)
- diagnosis: one sentence, what is the single biggest thing to fix or keep
- nextMove: one specific action the admin can do today in the dashboard (e.g. clear reports, boost listing, broadcast), with why
- risks: 1-3 short risks if any

Rules: Use numbers from data only. No emojis. No fluff. Be direct like an analyst. Keep nextMove actionable and reversible.

Return ONLY JSON with keys: snapshot, progress, funnelInsight, moneyInsight, trustInsight, diagnosis, nextMove, risks (array), table (by category + boosted).`;

    const raw = await askGemini(prompt);
    const parsed = JSON.parse(raw);
    // Validate shape
    if (!parsed.snapshot || !parsed.diagnosis || !parsed.nextMove) throw new Error("Invalid Jegede JSON");
    if (!Array.isArray(parsed.risks)) parsed.risks = [String(parsed.risks || "")];
    return parsed;
  } catch (e) {
    console.error("[JEGEDE GEMINI ERROR]", e.message);
    return null;
  }
}

// POST /api/jegede/update — body: { message?: string } — "update" triggers full briefing; any other text also gets briefing (admin context)
router.post("/update", async (req, res) => {
  try {
    const msg = (req.body?.message || "update").toString().trim().toLowerCase();
    // only respond to "update" or empty; otherwise still give briefing but note the phrase
    const isUpdate = !msg || msg === "update" || msg.includes("update");

    const snapshot = await buildSnapshot();
    let briefing = await geminiBriefing(snapshot);
    if (!briefing) briefing = fallbackBriefing(snapshot);

    return res.status(200).json({
      ok: true,
      isUpdate,
      generatedAt: snapshot.generatedAt,
      data: snapshot, // receipts — every number is verifiable
      briefing, // simple-English analyst output
      meta: {
        source: briefing === fallbackBriefing(snapshot) ? "fallback" : "gemini",
        phrase: req.body?.message || "update",
      },
    });
  } catch (err) {
    console.error("[JEGEDE UPDATE ERROR]", err);
    return res.status(500).json({ error: "Could not build update" });
  }
});

// GET /api/jegede/update — same as POST for convenience
router.get("/update", async (req, res) => {
  try {
    const snapshot = await buildSnapshot();
    let briefing = await geminiBriefing(snapshot);
    if (!briefing) briefing = fallbackBriefing(snapshot);
    return res.status(200).json({ ok: true, generatedAt: snapshot.generatedAt, data: snapshot, briefing, meta: { source: "fallback-or-gemini" } });
  } catch (err) {
    console.error("[JEGEDE GET UPDATE ERROR]", err);
    return res.status(500).json({ error: "Could not build update" });
  }
});

module.exports = router;
