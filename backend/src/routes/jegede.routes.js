// src/routes/jegede.routes.js — Jegede: admin Data Analyst & strategist
// Not a personal shopper (Frederick). Jegede reads real analytics and tells you
// where we are, what's working, and the ONE next move.
// Trigger: POST /api/jegede/update with body { message: "update" } (case-insensitive) or empty -> always returns briefing.
// ADMIN ONLY.

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { jegedeLimiter } = require("../middleware/rateLimit");
const prisma = require("../db");

const router = express.Router();
router.use(jegedeLimiter);
router.use(protect, requireAdmin);

// ─── Build real snapshot from DB — every number is a real query ───────
// Matches what the site actually does today: listings + gig escrow + service bookings + gig wallet + books + random discover + per-profile OG
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
    // — Gig & service & wallet (new) —
    totalGigs,
    openGigs,
    claimedGigs,
    completedGigs,
    disputedGigs,
    disputedService,
    pendingWithdrawals,
    pendingServiceBookings,
    gigBalanceAgg,
    gigWalletTx7d,
    platformProfitAgg,
    platformProfitBySource,
    bookListings,
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
    prisma.tokenPurchase.aggregate({ where: { status: "SUCCESS", user: { role: { not: "ADMIN" } } }, _sum: { amount: true, quantity: true } }),
    prisma.tokenPurchase.count({ where: { status: "SUCCESS", createdAt: { gte: sevenDaysAgo }, user: { role: { not: "ADMIN" } } } }),
    prisma.user.aggregate({ _sum: { tokenBalance: true }, _avg: { tokenBalance: true } }),
    prisma.listing.findMany({ orderBy: { contactViews: "desc" }, take: 3, select: { id: true, title: true, contactViews: true } }),
    prisma.listing.findMany({ orderBy: { favorites: { _count: "desc" } }, take: 3, select: { id: true, title: true, _count: { select: { favorites: true } } } }),
    prisma.listing.groupBy({ by: ["category"], where: { isAvailable: true }, _count: true }),
    prisma.contactView.groupBy({ by: ["viewerId"], where: { createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } }).then(r=>r.length),
    // gig/service/wallet
    prisma.gig.count(),
    prisma.gig.count({ where: { status: "OPEN" } }),
    prisma.gig.count({ where: { status: "CLAIMED" } }),
    prisma.gig.count({ where: { status: "COMPLETED" } }),
    prisma.gig.count({ where: { status: "DISPUTED" } }),
    prisma.serviceBooking.count({ where: { status: "DISPUTED" } }),
    prisma.gigWithdrawal.count({ where: { status: "PENDING" } }),
    prisma.serviceBooking.count({ where: { status: "PENDING" } }),
    prisma.user.aggregate({ _sum: { gigBalance: true } }),
    prisma.gigWalletTransaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(()=>0),
    prisma.platformProfit.aggregate({ _sum: { grossFee: true, netFee: true } }).catch(()=>({ _sum: { grossFee: 0, netFee: 0 } })),
    prisma.platformProfit.groupBy({ by: ["source"], _sum: { grossFee: true }, _count: { _all: true } }).catch(()=>[]),
    prisma.listing.count({ where: { category: "BOOKS", isAvailable: true } }).catch(()=>0),
  ]);

  const revenueNaira = (moneyAgg._sum.amount || 0) / 100;
  const tokensSold = moneyAgg._sum.quantity || 0;
  const avgBalance = Number((balanceStats._avg.tokenBalance || 0).toFixed(1));
  const totalBalance = balanceStats._sum.tokenBalance || 0;
  const totalGigBalanceKobo = gigBalanceAgg._sum.gigBalance || 0;
  const totalGigBalanceNaira = totalGigBalanceKobo / 100;
  const profitGrossKobo = platformProfitAgg._sum.grossFee || 0;
  const profitBySource = platformProfitBySource.map(p=>({ source: p.source, grossKobo: p._sum.grossFee || 0, count: p._count._all }));

  // Funnel rates
  const favRate = activeListings ? (totalFavorites / activeListings).toFixed(2) : 0;
  const contactRate = activeListings ? (totalContactViews / activeListings).toFixed(2) : 0;
  const contact7dRate = activeListings ? (newContactViews7d / Math.max(1, activeListings)).toFixed(2) : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals: { totalUsers, totalListings, activeListings, totalFavorites, totalContactViews, pendingReports, coldListings, boosted },
    growth: { newUsers7d, newListings7d, newFavorites7d, newContactViews7d, dau },
    funnel: { favRate, contactRate, contact7dRate },
    money: { revenueNaira, tokensSold, recentSuccess7d: moneyRecent, totalBalance, avgBalance, profitGrossKobo, profitGrossNaira: profitGrossKobo/100, profitBySource },
    gigs: { totalGigs, openGigs, claimedGigs, completedGigs, disputedGigs, pendingWithdrawals, gigWalletTx7d },
    services: { disputedService, pendingServiceBookings },
    wallet: { totalGigBalanceKobo, totalGigBalanceNaira },
    books: { activeBookListings: bookListings },
    byCategory: byCategory.map(c=>({ category: c.category, count: c._count })),
    topContacted: topContacted.map(l=>({ id:l.id, title:l.title, views:l.contactViews })),
    topFavorited: topFavorited.map(l=>({ id:l.id, title:l.title, favs:l._count.favorites })),
    trust: { pendingReports, byReason: trustedStats },
    window: { sevenDaysAgo: sevenDaysAgo.toISOString(), thirtyDaysAgo: thirtyDaysAgo.toISOString() },
  };
}

// ─── Rule-based fallback briefing (no Gemini) — simple English, matches site today ─────────
function fallbackBriefing(s) {
  const lines = [];
  // Diagnosis priority: trust > gig disputes > money > funnel > growth
  let diagnosis = "";
  let nextMove = "";
  let risks = [];

  if (s.trust.pendingReports > 3) {
    diagnosis = `Trust needs attention — ${s.trust.pendingReports} reports are still pending.`;
    nextMove = `Clear pending reports in /admin/reports today. Buyers trust drops fast when reports sit.`;
    risks.push(`Pending reports: ${s.trust.pendingReports}`);
  } else if ((s.gigs?.disputedGigs || 0) > 2 || (s.services?.disputedService || 0) > 2) {
    diagnosis = `Escrow needs attention — ${s.gigs.disputedGigs} gig disputes and ${s.services.disputedService} service disputes are open.`;
    nextMove = `Resolve disputes in /admin/disputes — release or refund quickly, auto-release pauses while disputed.`;
    risks.push(`Disputes: gigs ${s.gigs.disputedGigs}, services ${s.services.disputedService}`);
  } else if (s.gigs?.pendingWithdrawals > 5) {
    diagnosis = `Payouts are queuing — ${s.gigs.pendingWithdrawals} gig withdrawals are in review.`;
    nextMove = `Approve or reject withdrawals in /admin/withdrawals today — users wait on payout.`;
    risks.push(`Pending withdrawals: ${s.gigs.pendingWithdrawals}`);
  } else if (s.growth.newUsers7d === 0 && s.growth.newListings7d === 0) {
    diagnosis = `Growth is flat — no new users or listings in 7 days.`;
    nextMove = `Push one listing to WhatsApp broadcast or daily email to bring sellers back. Discover is now randomized so fresh posts get seen.`;
    risks.push("No growth in 7 days");
  } else if (parseFloat(s.funnel.contactRate) < 0.5) {
    diagnosis = `People are browsing but not contacting — contact rate is ${s.funnel.contactRate} per active listing.`;
    nextMove = `Check if top listings have clear photos and WhatsApp set. Boost one strong listing to test if contact rate lifts. Per-profile OG images now make shared links convert better.`;
    risks.push(`Low contact rate: ${s.funnel.contactRate}`);
  } else if (s.money.revenueNaira === 0 && (s.money.profitGrossKobo || 0) === 0) {
    diagnosis = `No paid tokens or gig/service fees yet — marketplace is active but not monetized (admins are free, only non-admin fees count).`;
    nextMove = `Test a boost offer: 1 token for 24h Featured on a top item and see if sellers buy. Gig 20% and service 20% fees only apply to non-admin.`;
    risks.push("Zero revenue from tokens + platform fees");
  } else {
    diagnosis = `Marketplace is healthy — ${s.totals.activeListings} active items (${s.books?.activeBookListings || 0} books), ${s.gigs?.openGigs || 0} open gigs, ${s.growth.newContactViews7d} contacts in 7 days.`;
    nextMove = `Double down on what works: boost the top-contacted item, keep ghost listings fresh, and watch gig wallet tx ${s.gigs?.gigWalletTx7d || 0} in 7d.`;
  }

  if (s.totals.coldListings > s.totals.activeListings * 0.4) risks.push(`${s.totals.coldListings} cold listings (0 favs) — they make the feed look empty`);
  if (s.money.avgBalance < 1) risks.push(`Average token balance is ${s.money.avgBalance} — many users are near zero`);
  if (s.wallet && s.wallet.totalGigBalanceNaira > 500000) risks.push(`High gig wallet liability ₦${s.wallet.totalGigBalanceNaira.toLocaleString()} — ensure Flutterwave balance covers pending withdrawals`);
  if (s.gigs && s.gigs.openGigs > 20) risks.push(`Many open gigs (${s.gigs.openGigs}) — check expiry and auto-release health`);

  const snapshot = `We have ${s.totals.totalUsers} users and ${s.totals.activeListings} active listings (out of ${s.totals.totalListings} total, ${s.books?.activeBookListings || 0} books). Gigs: ${s.gigs?.totalGigs || 0} total (${s.gigs?.openGigs || 0} open, ${s.gigs?.completedGigs || 0} completed, ${s.gigs?.disputedGigs || 0} disputed). Services: ${s.services?.pendingServiceBookings || 0} pending, ${s.services?.disputedService || 0} disputed. In the last 7 days: ${s.growth.newUsers7d} new users, ${s.growth.newListings7d} new listings, ${s.growth.newContactViews7d} contact clicks, ${s.gigs?.gigWalletTx7d || 0} gig wallet tx.`;

  const progress = `Funnel: ${s.totals.totalFavorites} total favorites (${s.funnel.favRate} per listing) and ${s.totals.totalContactViews} contact views (${s.funnel.contactRate} per listing). Money: ₦${s.money.revenueNaira.toLocaleString()} from ${s.money.tokensSold} tokens (non-admin) + ₦${(s.money.profitGrossNaira || 0).toLocaleString()} platform fees (${(s.money.profitBySource || []).map(p=>`${p.source}:${p.grossKobo/100}`).join(", ") || "none"}) · ${s.money.recentSuccess7d} paid token purchases in 7d. Avg token balance ${s.money.avgBalance}, gig wallet liability ₦${(s.wallet?.totalGigBalanceNaira || 0).toLocaleString()}.`;

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
    const prompt = `You are Jegede, a professional Data Analyst and Strategist for Trend Tribe — a student-only peer-to-peer marketplace for campus communities (trendtribe.app). You are NOT a personal shopper like Frederick.

What the site actually does today (ground truth — do not invent outside this):
- Listings: categories ACCESSORIES, FASHION, BEAUTY_AND_PERSONAL_CARE, GADGETS, BOOKS (📚), SNACKS, SERVICES, OTHERS; subcategories for fashion/beauty/accessories; condition NEW..POOR (not for SERVICES). 3 free active listings per user (SERVICES: 14-day trial then 1 free), then 1 token per extra listing, 0.5 token per extra image beyond 3 (max 5), boost 1 token/24h (tier 2 Picks = 2 tokens). Admins are free for all paid features — no token/fee is charged or counted toward profit.
- Gig escrow marketplace (Naira in gigBalance, kobo): post gig → escrow held, claim free → poster confirms → 80% to claimer, 20% platform fee (5% fee on cancel before claim, admin free). Withdraw/transfer 1% fee (admin free). 72h auto-release, disputes pause release. Every credit/debit logs GigWalletTransaction + notification + history.
- Service bookings: book service (escrow from gigBalance, 1h timer) → provider confirms (20% fee, admin free) → both mark completed → escrow released to provider. Disputes, cancel/expire refunds.
- Discovery: marketplace default plus Discover feed at /marketplace?view=discover — now RANDOMIZED (sort=random, Fisher-Yates) so latest does not dominate. Per-profile OG images: /profile/:slug uses avatar as og:image (fallback icon-512.png) via Helmet + Netlify/Cloudflare bot HTML for WhatsApp.
- Money: tokens ₦200 each via Flutterwave (hash-verified webhook), gig Naira top-up via Flutterwave, buy tokens with gig balance. Platform profit (PlatformProfit table) only counts non-admin: TOKEN_SOLD, GIG_CONFIRM_20, GIG_CANCEL_5, SERVICE_CONFIRM_20, GIG_TRANSFER_1P, GIG_WITHDRAW_1P. Gig wallet liability = sum gigBalance. Forgot-password uses Brevo and canonical https://trendtribe.app/reset-password?token=.

Data (all numbers are real DB counts, do not invent):
${JSON.stringify(s, null, 2)}

Task: When the admin says "update", explain in SIMPLE English:
- snapshot: 2 sentences, where we are now (users, active listings incl. books, gigs open/claimed/completed/disputed, 7d growth, gig wallet tx)
- progress: funnel (favorites per listing, contact rate) and money (revenue non-admin, tokens, avg balance, platform fees by source, gig wallet liability)
- diagnosis: one sentence, the single biggest thing to fix or keep (prioritize trust > disputes > withdrawals > funnel > money)
- nextMove: one specific action the admin can do today in the dashboard (e.g. clear reports, resolve disputes, approve withdrawals, boost listing, broadcast), with why — mention random discover and per-profile OG when relevant
- risks: 1-3 short risks if any (cold listings, low token balance, high gig liability, many open gigs, pending withdrawals/disputes)

Rules: Use numbers from data only. No emojis. No fluff. Be direct like an analyst. Keep nextMove actionable and reversible. Mention BOOKS and SERVICES explicitly when they appear in byCategory.

Return ONLY JSON with keys: snapshot, progress, funnelInsight, moneyInsight, trustInsight, diagnosis, nextMove, risks (array), table (by category + boosted + books).`;

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
    const rawMsg = (req.body?.message || "update").toString();
    if (rawMsg.length > 1000) return res.status(400).json({ error: "Message too long (max 1000)" });
    const msg = rawMsg.trim().toLowerCase();
    // only respond to "update" or empty; otherwise still give briefing but note the phrase
    const isUpdate = !msg || msg === "update" || msg.includes("update");

    const snapshot = await buildSnapshot();
    let briefing = await geminiBriefing(snapshot);
    let usedFallback = false;
    if (!briefing) { briefing = fallbackBriefing(snapshot); usedFallback = true; }

    return res.status(200).json({
      ok: true,
      isUpdate,
      generatedAt: snapshot.generatedAt,
      data: snapshot, // receipts — every number is verifiable
      briefing, // simple-English analyst output
      meta: {
        source: usedFallback ? "fallback" : "gemini",
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
    let usedFallback = false;
    if (!briefing) { briefing = fallbackBriefing(snapshot); usedFallback = true; }
    return res.status(200).json({ ok: true, generatedAt: snapshot.generatedAt, data: snapshot, briefing, meta: { source: usedFallback ? "fallback" : "gemini" } });
  } catch (err) {
    console.error("[JEGEDE GET UPDATE ERROR]", err);
    return res.status(500).json({ error: "Could not build update" });
  }
});

module.exports = router;
