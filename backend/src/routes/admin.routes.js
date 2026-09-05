// src/routes/admin.routes.js — Admin Route Foundation (Phase 1 placeholders only)

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../db");
const cloudinary = require("../config/cloudinary");
const config = require("../config/env");
const { sendWeeklyEmail } = require("../scripts/sendWeeklyEmail");
const { sendInboxEmail } = require("../utils/email");

const router = express.Router();

router.get("/", protect, requireAdmin, (req, res) => {
  res.status(200).json({ message: "Admin access granted" });
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats ← PROTECTED + ADMIN ONLY
// ─────────────────────────────────────────────────────────────
router.get("/stats", protect, requireAdmin, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalListings,
      activeListings,
      newUsers,
      newListings,
      totalFavorites,
      newFavorites,
      coldListings,
      totalNotifications,
      topFavorited,
      totalContactViews,
      newContactViews,
      topContacted,
      totalSellers,
      totalBuyers,
      totalAdmins,
      totalRegularUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.listing.count({ where: { isAvailable: true } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.favorite.count(),
      prisma.favorite.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.listing.count({ where: { isAvailable: true, favorites: { none: {} } } }),
      prisma.notification.count(),
      prisma.listing.findMany({
        orderBy: { favorites: { _count: "desc" } },
        take: 5,
        select: { id: true, title: true, slug: true, _count: { select: { favorites: true } } },
      }),
      prisma.contactView.count(),
      prisma.contactView.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.listing.findMany({
        orderBy: { contactViews: "desc" },
        take: 5,
        select: { id: true, title: true, slug: true, contactViews: true },
      }),
      prisma.user.count({ where: { role: "SELLER" } }),
      prisma.user.count({ where: { role: "BUYER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "USER" } }),
    ]);

    return res.status(200).json({
      totalUsers,
      totalListings,
      activeListings,
      newUsers,
      newListings,
      totalFavorites,
      newFavorites,
      coldListings,
      totalNotifications,
      topFavorited: topFavorited.map((l) => ({ id: l.id, slug: l.slug, title: l.title, favoriteCount: l._count.favorites })),
      totalContactViews,
      newContactViews,
      topContacted,
      totalSellers,
      totalBuyers,
      totalAdmins,
      totalRegularUsers,
    });
  } catch (err) {
    console.error("[GET ADMIN STATS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", protect, requireAdmin, (req, res) => {
  res.status(200).json({ admin: req.user });
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/listings ← PROTECTED + ADMIN ONLY
// ─────────────────────────────────────────────────────────────
router.get("/listings", protect, requireAdmin, async (req, res) => {
  try {
    const {
      search,
      category,
      subcategory,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search?.trim()) {
      where.title = { contains: search.trim(), mode: "insensitive" };
    }
    if (category) where.category = category.toUpperCase();
    if (subcategory) where.subcategory = subcategory.toUpperCase();

    const [listings, totalCount] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          category: true,
          subcategory: true,
          price: true,
          isAvailable: true,
          boostedUntil: true,
          contactViews: true,
          createdAt: true,
          seller: { select: { username: true } },
          _count: { select: { favorites: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      listings: listings.map((l) => ({ ...l, price: parseFloat(l.price), favoriteCount: l._count.favorites })),
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("[ADMIN GET LISTINGS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/listings/:id ← PROTECTED + ADMIN ONLY
// ─────────────────────────────────────────────────────────────
router.delete("/listings/:id", protect, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid listing ID" });

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    if (listing.imagePublicIds?.length) {
      await Promise.allSettled(
        listing.imagePublicIds.map((pid) => cloudinary.uploader.destroy(pid)),
      );
    }

    await prisma.listing.delete({ where: { id } });

    return res.status(200).json({ message: "Listing deleted successfully ✅" });
  } catch (err) {
    console.error("[ADMIN DELETE LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users ← PROTECTED + ADMIN ONLY
// ─────────────────────────────────────────────────────────────
router.get("/users", protect, requireAdmin, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search?.trim()) {
      where.OR = [
        { username: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }
    if (role && ["BUYER", "SELLER", "ADMIN", "USER"].includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          school: true,
          matricNumber: true,
          role: true,
          tokenBalance: true,
          createdAt: true,
          _count: { select: { listings: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Aggregate contact views per user (admin only)
    const contactTotals = await prisma.listing.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: users.map((u) => u.id) } },
      _sum: { contactViews: true },
    });
    const contactMap = Object.fromEntries(contactTotals.map((c) => [c.sellerId, c._sum.contactViews ?? 0]));
    const usersWithContacts = users.map((u) => ({ ...u, totalContactViews: contactMap[u.id] ?? 0 }));

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      users: usersWithContacts,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("[ADMIN GET USERS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id ← PROTECTED + ADMIN ONLY
// ─────────────────────────────────────────────────────────────
router.delete("/users/:id", protect, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

    if (id === req.user.id) {
      return res
        .status(400)
        .json({ error: "You cannot delete your own admin account." });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ message: "User deleted successfully ✅" });
  } catch (err) {
    console.error("[ADMIN DELETE USER ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/reports ← PROTECTED + ADMIN ONLY
// ─────────────────────────────────────────────────────────────
router.get("/reports", protect, requireAdmin, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        listing: { select: { id: true, title: true } },
        reporter: { select: { username: true } },
      },
    });

    return res.status(200).json({ reports });
  } catch (err) {
    console.error("[ADMIN GET REPORTS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/favorites ← PROTECTED + ADMIN ONLY — who favorited what
// ─────────────────────────────────────────────────────────────
router.get("/favorites", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [favorites, totalCount] = await Promise.all([
      prisma.favorite.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          listing: { select: { id: true, title: true, category: true, isAvailable: true } },
          user: { select: { id: true, username: true, fullName: true, school: true } },
        },
      }),
      prisma.favorite.count(),
    ]);
    return res.status(200).json({
      favorites: favorites.map((f) => ({
        id: f.id,
        createdAt: f.createdAt,
        listing: f.listing,
        user: f.user,
      })),
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error("[ADMIN GET FAVORITES ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/brevo-usage ← PROTECTED + ADMIN ONLY
// Shows how many free Brevo emails are left this month/day
// Brevo free: 300/day (9000/month) — uses /v3/account + /v3/smtp/statistics
// ─────────────────────────────────────────────────────────────
router.get("/brevo-usage", protect, requireAdmin, async (req, res) => {
  try {
    const apiKey = config.email.brevoApiKey;
    if (!apiKey) return res.status(500).json({ error: "BREVO_API_KEY not set" });

    // 1. Account / plan info
    const accountRes = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": apiKey, "accept": "application/json" },
    });
    const account = accountRes.ok ? await accountRes.json() : null;

    // 2. Daily stats for today (Brevo free limit is per-day)
    const today = new Date().toISOString().slice(0, 10);
    const statsRes = await fetch(
      `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${today}&endDate=${today}`,
      { headers: { "api-key": apiKey, "accept": "application/json" } }
    );
    const stats = statsRes.ok ? await statsRes.json() : null;

    // Extract plan limit — free = 300/day, paid varies
    let dailyLimit = 300;
    let planName = "Free";
    if (account?.plan) {
      const freePlan = Array.isArray(account.plan) ? account.plan.find((p) => p.type === "free") : null;
      const anyPlan = Array.isArray(account.plan) ? account.plan[0] : null;
      if (freePlan?.credits) dailyLimit = freePlan.credits;
      else if (anyPlan?.credits) dailyLimit = anyPlan.credits;
      else if (account.plan?.credits) dailyLimit = account.plan.credits;
      planName = freePlan ? "Free" : anyPlan?.type || account.plan?.type || "Free";
      // Brevo sometimes returns plan as object
      if (typeof account.plan === "object" && !Array.isArray(account.plan) && account.plan.type) {
        planName = account.plan.type;
        if (account.plan.credits) dailyLimit = account.plan.credits;
      }
    }
    // Fallback: if account has `relay.data` etc, keep 300
    const sentToday = stats?.statistics?.[today]?.statistics?.globalStats?.sent ?? stats?.sent ?? 0;
    // Monthly: sum from 1st to today if stats available, else estimate
    let sentThisMonth = 0;
    if (stats?.statistics) {
      Object.values(stats.statistics).forEach((day) => {
        sentThisMonth += day.statistics?.globalStats?.sent ?? 0;
      });
    }

    return res.status(200).json({
      plan: planName,
      email: account?.email || null,
      companyName: account?.companyName || null,
      dailyLimit,
      sentToday,
      remainingToday: Math.max(0, dailyLimit - sentToday),
      sentThisMonth,
      monthlyLimit: dailyLimit * 30,
      remainingMonth: Math.max(0, dailyLimit * 30 - sentThisMonth),
      raw: { account, stats },
    });
  } catch (err) {
    console.error("[ADMIN BREVO USAGE ERROR]", err.message);
    return res.status(502).json({ error: "Could not load Brevo usage", details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/cloudinary-usage ← PROTECTED + ADMIN ONLY
// Shows Cloudinary free quota usage (credits, storage, transformations, bandwidth)
// Helps admin know how much of 25-credit free tier is used
// ─────────────────────────────────────────────────────────────
router.get("/cloudinary-usage", protect, requireAdmin, async (req, res) => {
  try {
    const usage = await cloudinary.api.usage();
    // usage contains: plan, credits { usage, limit, used_percent }, transformations, storage, bandwidth, requests, resources etc.
    // Normalize for frontend
    const credits = usage.credits || { usage: usage.transformations?.usage || 0, limit: 25000, used_percent: 0 };
    // Cloudinary free plan reports 25 credits as transformations limit in older API; credits field is newer — fallback
    if (!credits.limit && usage.plan === "Free") credits.limit = 25;
    return res.status(200).json({ usage });
  } catch (err) {
    console.error("[ADMIN CLOUDINARY USAGE ERROR]", err.message);
    // Don't leak raw error; cloudinary returns 401/420 when disabled
    return res.status(502).json({ error: "Could not load Cloudinary usage. Check Cloudinary dashboard or try again.", details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/db-usage ← ADMIN ONLY
// Shows Postgres DB size / free space left (Neon free ~5GB)
// ─────────────────────────────────────────────────────────────
router.get("/db-usage", protect, requireAdmin, async (req, res) => {
  try {
    const [db] = await prisma.$queryRaw`SELECT pg_database_size(current_database())::bigint as size, pg_size_pretty(pg_database_size(current_database())) as pretty`;
    const tablesRaw = await prisma.$queryRaw`SELECT relname as table, pg_size_pretty(pg_total_relation_size(relid)) as size, pg_total_relation_size(relid) as bytes FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10`;
    const tables = tablesRaw.map((t) => ({ ...t, bytes: Number(t.bytes) }));
    // Neon Free: 0.5 GB per project (not 5GB) — 5GB is transfer, storage is 0.5GB
    const limitBytes = 0.5 * 1024 * 1024 * 1024;
    const used = Number(db.size);
    const percent = Math.min(100, (used / limitBytes) * 100);
    const counts = {
      users: await prisma.user.count(),
      listings: await prisma.listing.count(),
      messages: await prisma.message.count().catch(() => 0),
      notifications: await prisma.notification.count(),
      favorites: await prisma.favorite.count(),
    };
    return res.status(200).json({ size: used, pretty: db.pretty, limitBytes, limitPretty: "0.5 GB", percent: Number(percent.toFixed(2)), tables, counts });
  } catch (err) {
    console.error("[ADMIN DB USAGE ERROR]", err.message);
    return res.status(500).json({ error: "Could not load DB usage" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/messages/broadcast ← ADMIN ONLY
// Body: { subject?, body } — admin types message, sent to inbox of every user
// Also creates notification preview + (optional) email "you have a message on Trend Tribe"
// ─────────────────────────────────────────────────────────────
router.post("/messages/broadcast", protect, requireAdmin, async (req, res) => {
  try {
    const { subject, body, bodyText } = req.body;
    const text = (body || bodyText || "").trim();
    if (!text) return res.status(400).json({ error: "Message body is required" });
    if (text.length > 5000) return res.status(400).json({ error: "Message too long (max 5000)" });
    const users = await prisma.user.findMany({ select: { id: true } });
    const recipientIds = users.filter((u) => u.id !== req.user.id).map((u) => u.id);
    if (recipientIds.length === 0) return res.status(200).json({ sent: 0 });
    const messagesData = recipientIds.map((rid) => ({ subject: subject?.trim() || null, body: text, senderId: req.user.id, recipientId: rid }));
    await prisma.message.createMany({ data: messagesData });
    // notifications with preview (first 80 chars)
    const preview = text.slice(0, 80) + (text.length > 80 ? "…" : "");
    const notifs = recipientIds.map((uid) => ({ userId: uid, actorId: req.user.id, type: "MESSAGE", listingId: null }));
    // store preview in notification via raw? For MVP, notifications will show generic text, inbox has full body
    await prisma.notification.createMany({ data: notifs });
    // realtime: push to inbox + bell instantly
    try {
      const { emitMessage, emitNotification } = require("../realtime");
      // fetch created messages for payload (last N)
      const created = await prisma.message.findMany({ where: { senderId: req.user.id }, orderBy: { createdAt: "desc" }, take: recipientIds.length, select: { id: true, subject: true, body: true, senderId: true, recipientId: true, createdAt: true } });
      for (const m of created) {
        emitMessage(m.recipientId, m);
        emitNotification(m.recipientId, { type: "MESSAGE", actorId: req.user.id });
      }
    } catch {}
    return res.status(200).json({ sent: recipientIds.length, preview });
  } catch (err) {
    console.error("[ADMIN BROADCAST ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/messages/notify-email ← ADMIN ONLY
// After inbox broadcast, optionally also email "you have a message on Trend Tribe" to actual emails
// Body: { subject?, body } — same as broadcast, sent in background with View → Inbox button
// ─────────────────────────────────────────────────────────────
router.post("/messages/notify-email", protect, requireAdmin, async (req, res) => {
  try {
    const { subject, body } = req.body;
    const text = (body || "").trim();
    if (!text) return res.status(400).json({ error: "Message body is required" });
    res.status(202).json({ message: "Email notify started in background" });
    // background send without blocking response
    const users = await prisma.user.findMany({ where: { isVerified: true }, select: { email: true, fullName: true } });
    let sent = 0, failed = 0;
    for (const u of users) {
      if (u.id === req.user.id) continue;
      try {
        await sendInboxEmail(u.email, u.fullName || "there", subject, text);
        sent++;
        await new Promise((r) => setTimeout(r, 400)); // brevo free: ~300/day, throttle
      } catch (e) {
        failed++;
        console.error(`[INBOX EMAIL FAIL] ${u.email}:`, e.message);
      }
    }
    console.log(`[INBOX EMAIL DONE] sent ${sent}, failed ${failed}`);
  } catch (err) {
    console.error("[ADMIN NOTIFY EMAIL ERROR]", err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/listings/:id/share ← ADMIN ONLY
// Sends that listing to inbox of every user (product broadcast)
// Body: { body? } optional custom text, else default
// ─────────────────────────────────────────────────────────────
router.post("/listings/:id/share", protect, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid listing ID" });
    const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const custom = (req.body.body || "").trim();
    const body = custom || `Check this on Trend Tribe: ${listing.title} — tap to view`;
    const users = await prisma.user.findMany({ select: { id: true } });
    const recipientIds = users.filter((u) => u.id !== req.user.id).map((u) => u.id);
    const messagesData = recipientIds.map((rid) => ({ subject: null, body, senderId: req.user.id, recipientId: rid, listingId: id }));
    await prisma.message.createMany({ data: messagesData });
    const notifs = recipientIds.map((uid) => ({ userId: uid, actorId: req.user.id, type: "MESSAGE", listingId: id }));
    await prisma.notification.createMany({ data: notifs });
    return res.status(200).json({ sent: recipientIds.length });
  } catch (err) {
    console.error("[ADMIN SHARE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/listings/:id/contact-views ← PROTECTED + ADMIN ONLY
// Detailed per-listing contact click log (admin only)
// ─────────────────────────────────────────────────────────────
router.get("/listings/:id/contact-views", protect, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid listing ID" });
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, title: true, contactViews: true, seller: { select: { username: true } } },
    });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [views, totalCount] = await Promise.all([
      prisma.contactView.findMany({
        where: { listingId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: { viewer: { select: { id: true, username: true, fullName: true, school: true } } },
      }),
      prisma.contactView.count({ where: { listingId: id } }),
    ]);
    return res.status(200).json({
      listing,
      views,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error("[ADMIN GET CONTACT VIEWS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/reports/:id/ignore ← PROTECTED + ADMIN ONLY
// ─────────────────────────────────────────────────────────────
router.patch("/reports/:id/ignore", protect, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid report ID" });

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ error: "Report not found" });

    await prisma.report.update({ where: { id }, data: { status: "IGNORED" } });

    return res.status(200).json({ message: "Report ignored ✅" });
  } catch (err) {
    console.error("[ADMIN IGNORE REPORT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/send-weekly-email ← SECRET KEY ONLY (no login)
// Called by an external cron service (e.g. cron-job.org) on a
// schedule. Guarded by a shared secret header, not a user session,
// since the caller has no logged-in user.
// Header required: x-cron-secret: <CRON_SECRET>
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// In-memory status of the last manual weekly email run.
// Intentionally NOT persisted to the database (kept in process
// memory only) — resets on server restart/redeploy, by design.
// ─────────────────────────────────────────────────────────────
let lastWeeklyEmailRun = null; // { status: "running" | "done" | "error", result?, startedAt, finishedAt? }
// ─────────────────────────────────────────────────────────────
// POST /api/admin/trigger-weekly-email ← PROTECTED + ADMIN ONLY
// Manual, fire-and-forget trigger for the weekly email, clicked
// from the admin dashboard. Responds immediately; the actual send
// (with its built-in 2s-per-recipient delay) runs in the background.
// ─────────────────────────────────────────────────────────────
router.post("/trigger-weekly-email", protect, requireAdmin, (req, res) => {
  res.status(202).json({ message: "Weekly email send started in background." });
  lastWeeklyEmailRun = { status: "running", startedAt: new Date().toISOString() };
  sendWeeklyEmail()
    .then((result) => {
      lastWeeklyEmailRun = {
        status: "done",
        result,
        startedAt: lastWeeklyEmailRun.startedAt,
        finishedAt: new Date().toISOString(),
      };
      console.log("[MANUAL WEEKLY EMAIL] Complete:", result);
    })
    .catch((err) => {
      lastWeeklyEmailRun = {
        status: "error",
        error: err.message,
        startedAt: lastWeeklyEmailRun.startedAt,
        finishedAt: new Date().toISOString(),
      };
      console.error("[MANUAL WEEKLY EMAIL ERROR]", err);
    });
});

// ─── Daily email with custom message (design card) ──────────
let lastDailyEmailRun = null;
router.post("/trigger-daily-email", protect, requireAdmin, (req, res) => {
  const { subject, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message is required" });
  if (message.length > 2000) return res.status(400).json({ error: "Message too long (max 2000)" });
  res.status(202).json({ message: "Daily email send started in background." });
  lastDailyEmailRun = { status: "running", startedAt: new Date().toISOString(), subject, message };
  sendWeeklyEmail({ customMessage: message.trim(), customSubject: subject?.trim() || null })
    .then((result) => {
      lastDailyEmailRun = { status: "done", result, startedAt: lastDailyEmailRun.startedAt, finishedAt: new Date().toISOString() };
      console.log("[MANUAL DAILY EMAIL] Complete:", result);
    })
    .catch((err) => {
      lastDailyEmailRun = { status: "error", error: err.message, startedAt: lastDailyEmailRun.startedAt, finishedAt: new Date().toISOString() };
      console.error("[MANUAL DAILY EMAIL ERROR]", err);
    });
});
router.get("/daily-email-status", protect, requireAdmin, (req, res) => {
  if (!lastDailyEmailRun) return res.status(200).json({ status: "idle" });
  return res.status(200).json(lastDailyEmailRun);
});
// ─────────────────────────────────────────────────────────────
// GET /api/admin/weekly-email-status ← PROTECTED + ADMIN ONLY
// Poll this after triggering a send to see live status/result.
// In-memory only — reflects just the most recent run since last
// server restart.
// ─────────────────────────────────────────────────────────────
router.get("/weekly-email-status", protect, requireAdmin, (req, res) => {
  if (!lastWeeklyEmailRun) {
    return res.status(200).json({ status: "idle" });
  }
  return res.status(200).json(lastWeeklyEmailRun);
});
router.post("/send-weekly-email", async (req, res) => {
  const providedSecret = req.headers["x-cron-secret"];

  if (!providedSecret || providedSecret !== config.cronSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await sendWeeklyEmail();
    return res.status(200).json({
      message: "Weekly email run complete",
      ...result,
    });
  } catch (err) {
    console.error("[SEND WEEKLY EMAIL ENDPOINT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
