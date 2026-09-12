// src/routes/admin.routes.js — Admin Route Foundation (Phase 1 placeholders only)

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin, requireTopAdmin } = require("../middleware/admin.middleware");
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
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.listing.count({ where: { seller: { role: { not: "ADMIN" } } } }),
      prisma.listing.count({ where: { isAvailable: true, seller: { role: { not: "ADMIN" } } } }),
      prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { gte: sevenDaysAgo } } }),
      prisma.listing.count({ where: { seller: { role: { not: "ADMIN" } }, createdAt: { gte: sevenDaysAgo } } }),
      prisma.favorite.count({ where: { user: { role: { not: "ADMIN" } }, listing: { seller: { role: { not: "ADMIN" } } } } }),
      prisma.favorite.count({ where: { user: { role: { not: "ADMIN" } }, listing: { seller: { role: { not: "ADMIN" } } }, createdAt: { gte: sevenDaysAgo } } }),
      prisma.listing.count({ where: { isAvailable: true, seller: { role: { not: "ADMIN" } }, favorites: { none: {} } } }),
      prisma.notification.count({ where: { user: { role: { not: "ADMIN" } } } }),
      prisma.listing.findMany({
        where: { seller: { role: { not: "ADMIN" } } },
        orderBy: { favorites: { _count: "desc" } },
        take: 5,
        select: { id: true, title: true, slug: true, _count: { select: { favorites: true } } },
      }),
      prisma.contactView.count({ where: { listing: { seller: { role: { not: "ADMIN" } } } } }),
      prisma.contactView.count({ where: { listing: { seller: { role: { not: "ADMIN" } } }, createdAt: { gte: sevenDaysAgo } } }),
      prisma.listing.findMany({
        where: { seller: { role: { not: "ADMIN" } } },
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
    if (user.role === "ADMIN") {
      const { isTopAdmin } = require("../middleware/admin.middleware");
      if (!isTopAdmin(req.user)) return res.status(403).json({ error: "Only Top Admin can delete another admin." });
    }

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
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          reason: true,
          createdAt: true,
          listing: { select: { id: true, title: true } },
          reporter: { select: { username: true } },
        },
      }),
      prisma.report.count({ where: { status: "PENDING" } }),
    ]);

    return res.status(200).json({ reports, pagination: { totalCount, totalPages: Math.ceil(totalCount / limitNum), currentPage: pageNum, limit: limitNum } });
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
    for (let i = 0; i < messagesData.length; i += 800) await prisma.message.createMany({ data: messagesData.slice(i, i + 800) });
    // notifications with preview (first 80 chars)
    const preview = text.slice(0, 80) + (text.length > 80 ? "…" : "");
    const notifs = recipientIds.map((uid) => ({ userId: uid, actorId: req.user.id, type: "MESSAGE", listingId: null }));
    for (let i = 0; i < notifs.length; i += 800) await prisma.notification.createMany({ data: notifs.slice(i, i + 800) });
    // realtime: push to inbox + bell instantly + phone push (even when app closed)
    try {
      const { emitMessage, emitNotification } = require("../realtime");
      const { sendPushToUser } = require("../utils/push");
      const created = await prisma.message.findMany({ where: { senderId: req.user.id }, orderBy: { createdAt: "desc" }, take: recipientIds.length, select: { id: true, subject: true, body: true, senderId: true, recipientId: true, createdAt: true } });
      for (const m of created) {
        emitMessage(m.recipientId, m);
        emitNotification(m.recipientId, { type: "MESSAGE", actorId: req.user.id });
        // phone push (service worker) — badge count included
        prisma.notification.count({ where: { userId: m.recipientId, read: false } }).then((unread) => {
          sendPushToUser(prisma, m.recipientId, {
            title: m.subject || "Trend Tribe — New message",
            body: text.slice(0, 120),
            url: "/inbox",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            badgeCount: unread,
            tag: `msg-${m.id}`,
          }).catch(() => {});
        }).catch(() => {});
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
    for (let i = 0; i < messagesData.length; i += 800) await prisma.message.createMany({ data: messagesData.slice(i, i + 800) });
    const notifs = recipientIds.map((uid) => ({ userId: uid, actorId: req.user.id, type: "MESSAGE", listingId: id }));
    for (let i = 0; i < notifs.length; i += 800) await prisma.notification.createMany({ data: notifs.slice(i, i + 800) });
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

// ─── Gig withdrawals — admin approve → Flutterwave transfer ──
const { listGigWithdrawals, approveGigWithdrawal, rejectGigWithdrawal } = require("../controllers/gig.controller");
router.get("/gig-withdrawals", protect, requireTopAdmin, listGigWithdrawals);
router.get("/gig-withdrawals/export", protect, requireTopAdmin, async (req, res) => {
  try {
    const status = (req.query.status || "PENDING").toUpperCase();
    const where = status === "ALL" ? {} : { status };
    const withdrawals = await prisma.gigWithdrawal.findMany({ where, orderBy: { createdAt: "asc" } });
    const header = '"Account Number","Bank","Amount","Description"';
    const codeToSlug = { "044": "access", "058": "gtb", "011": "firstbank", "033": "uba", "057": "zenith", "032": "union", "035": "wema", "999992": "opay", "50211": "kuda", "50515": "moniepoint", "999991": "palmpay", "035A": "wema" };
    const rows = withdrawals.map(w => {
      const acc = (w.bankAccountNumber || "").trim();
      const bankRaw = (w.bankName || w.bankCode || "").trim();
      let bank = bankRaw.split(" ")[0].toLowerCase();
      // if bank is numeric code, map to slug like sample ("access" not "044")
      const code = (w.bankCode || "").trim();
      if (/^\d+$/.test(bank) && codeToSlug[code]) bank = codeToSlug[code];
      else if (codeToSlug[bankRaw.toLowerCase()]) bank = codeToSlug[bankRaw.toLowerCase()];
      // fallback: ensure lowercased, no spaces
      bank = bank.toLowerCase();
      const amount = String(Math.round((w.amount || 0) / 100));
      const desc = "TrendTribe Payout";
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      return `${esc(acc)},${esc(bank)},${esc(amount)},${esc(desc)}`;
    });
    const csv = [header, ...rows].join("\n") + "\n";
    const filename = `trend-tribe-payouts-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    console.error("[EXPORT CSV ERROR]", err.message);
    return res.status(500).json({ error: "Could not generate CSV" });
  }
});
router.post("/gig-withdrawals/:id/approve", protect, requireTopAdmin, approveGigWithdrawal);
router.post("/gig-withdrawals/:id/reject", protect, requireTopAdmin, rejectGigWithdrawal);

// ─── Admin treasury + profit — personal profit from fees ──
router.get("/treasury", protect, requireTopAdmin, async (req, res) => {
  try {
    const config = require("../config/env");
    let flutterAvailableKobo = null;
    try {
      const balRes = await fetch("https://api.flutterwave.com/v3/balances", { headers: { Authorization: `Bearer ${config.flutterwave.secretKey}` } });
      const balData = await balRes.json();
      const ngnBal = balData.data?.find?.(b=>b.currency==="NGN") || balData.data?.[0];
      flutterAvailableKobo = ngnBal ? Math.round(parseFloat(ngnBal.available_balance || 0) * 100) : null;
    } catch {}
    const pendingAgg = await prisma.gigWithdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true, fee: true }, _count: { _all: true } });
    const pendingInReviewKobo = (pendingAgg._sum.amount || 0) + (pendingAgg._sum.fee || 0);
    const pendingAmountKobo = pendingAgg._sum.amount || 0;
    const liabilitiesAgg = await prisma.user.aggregate({ _sum: { gigBalance: true } });
    const userLiabilitiesKobo = liabilitiesAgg._sum.gigBalance || 0;
    const netLiquidityKobo = flutterAvailableKobo !== null ? flutterAvailableKobo - pendingInReviewKobo : null;
    return res.json({ flutterAvailableKobo, pendingInReviewKobo, pendingAmountKobo, pendingFeeKobo: pendingAgg._sum.fee || 0, pendingCount: pendingAgg._count._all, userLiabilitiesKobo, netLiquidityKobo });
  } catch (err) {
    console.error("[TREASURY ERROR]", err.message);
    return res.status(500).json({ error: "Could not load treasury" });
  }
});

router.get("/profit-summary", protect, requireTopAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const d7 = new Date(now - 7*24*60*60*1000);
    const d30 = new Date(now - 30*24*60*60*1000);
    const bySource = await prisma.platformProfit.groupBy({ by: ["source"], _sum: { grossFee: true, netFee: true }, _count: { _all: true } });
    const totalGross = bySource.reduce((a,c)=>a+(c._sum.grossFee||0),0);
    const totalNet = bySource.reduce((a,c)=>a+(c._sum.netFee||0),0);
    const todayAgg = await prisma.platformProfit.aggregate({ where: { createdAt: { gte: startOfDay } }, _sum: { grossFee: true, netFee: true }, _count: { _all: true } });
    const sevenAgg = await prisma.platformProfit.aggregate({ where: { createdAt: { gte: d7 } }, _sum: { grossFee: true, netFee: true } });
    const thirtyAgg = await prisma.platformProfit.aggregate({ where: { createdAt: { gte: d30 } }, _sum: { grossFee: true, netFee: true } });
    // Only non-admin token purchases count toward personal profit
    const tokenAgg = await prisma.tokenPurchase.aggregate({ where: { status: "SUCCESS", user: { role: { not: "ADMIN" } } }, _sum: { quantity: true, amount: true }, _count: { _all: true } });
    const tokenViaGig = await prisma.platformProfit.aggregate({ where: { source: "TOKEN_SOLD", meta: { path: ["via"], equals: "GIG_BALANCE" } }, _sum: { grossFee: true }, _count: { _all: true } }).catch(()=>({ _sum:{ grossFee:0}, _count:{_all:0}}));
    return res.json({
      totalGrossKobo: totalGross, totalNetKobo: totalNet,
      bySource: bySource.map(r=>({ source:r.source, grossKobo:r._sum.grossFee||0, netKobo:r._sum.netFee||0, count:r._count._all })),
      today: { grossKobo: todayAgg._sum.grossFee||0, netKobo: todayAgg._sum.netFee||0, count: todayAgg._count._all },
      last7d: { grossKobo: sevenAgg._sum.grossFee||0, netKobo: sevenAgg._sum.netFee||0 },
      last30d: { grossKobo: thirtyAgg._sum.grossFee||0, netKobo: thirtyAgg._sum.netFee||0 },
      tokenSold: { count: tokenAgg._count._all, quantity: tokenAgg._sum.quantity||0, grossKobo: (tokenAgg._sum.quantity||0)*200*100, viaGigCount: tokenViaGig._count._all, viaGigKobo: tokenViaGig._sum.grossFee||0 }
    });
  } catch (err) {
    console.error("[PROFIT SUMMARY ERROR]", err.message);
    return res.status(500).json({ error: "Could not load profit" });
  }
});

// ─── Clear personal profit — restart, only non-admin going forward ──
router.delete("/profit/clear", protect, requireTopAdmin, async (req, res) => {
  try {
    if (req.body?.confirm !== "RESET" && req.query?.confirm !== "RESET") {
      return res.status(400).json({ error: "Send {confirm: 'RESET'} to clear profit — irreversible" });
    }
    const deleted = await prisma.platformProfit.deleteMany({});
    console.log(`[PROFIT CLEAR] admin ${req.user.id} cleared ${deleted.count} records`);
    return res.json({ message: `Cleared ${deleted.count} profit records — restart complete. Future profits only for non-admin accounts.`, deleted: deleted.count });
  } catch (err) {
    console.error("[CLEAR PROFIT ERROR]", err.message);
    return res.status(500).json({ error: "Could not clear profit" });
  }
});

// ─── Disputes — gigs + service bookings DISPUTED ──
router.get("/disputes", protect, requireAdmin, async (req, res) => {
  try {
    const gigs = await prisma.gig.findMany({ where: { status: "DISPUTED" }, orderBy: { updatedAt: "desc" }, include: { poster: { select: { id:true, username:true, fullName:true } }, claimer: { select: { id:true, username:true, fullName:true } } } });
    const bookings = await prisma.serviceBooking.findMany({ where: { status: "DISPUTED" }, orderBy: { updatedAt: "desc" }, include: { listing: { select: { id:true, title:true, price:true } }, booker: { select: { id:true, username:true, fullName:true } }, provider: { select: { id:true, username:true, fullName:true } } } });
    return res.json({ gigs, bookings, total: gigs.length + bookings.length });
  } catch (err) {
    console.error("[DISPUTES ERROR]", err.message);
    return res.status(500).json({ error: "Could not load disputes" });
  }
});

router.post("/disputes/resolve", protect, requireAdmin, async (req, res) => {
  try {
    const { type, id, decision } = req.body; // type: gig|service, decision: refund|release|split
    if (!["gig","service"].includes(type) || !id || !["refund","release","split"].includes(decision)) {
      return res.status(400).json({ error: "type must be gig/service, decision refund/release/split" });
    }
    if (type === "gig") {
      const gigId = parseInt(id,10);
      const gig = await prisma.gig.findUnique({ where: { id: gigId } });
      if (!gig || gig.status !== "DISPUTED") return res.status(400).json({ error: "Gig not in DISPUTED" });
      if (decision === "refund") {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: gig.posterId }, data: { gigBalance: { increment: gig.escrowAmount } } });
          await tx.gig.update({ where: { id: gigId }, data: { status: "CANCELLED" } });
        });
        try { const { recordWalletMovement } = require("../utils/wallet"); await recordWalletMovement({ userId: gig.posterId, direction: "CREDIT", amount: gig.escrowAmount, fee: 0, type: "GIG_DISPUTE_REFUND", title: "Dispute resolved — refunded", body: `Credit: ₦${(gig.escrowAmount/100).toLocaleString()} refunded for gig #${gigId} (admin decision: refund).`, meta: { gigId } }); } catch {}
      } else if (decision === "release") {
        const posterUser = await prisma.user.findUnique({ where: { id: gig.posterId }, select: { role: true } });
        const isPosterAdmin = posterUser?.role === "ADMIN";
        const fee = isPosterAdmin ? 0 : Math.floor(gig.escrowAmount*0.2);
        const pay = isPosterAdmin ? gig.escrowAmount : gig.escrowAmount - Math.floor(gig.escrowAmount*0.2);
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: gig.claimerId }, data: { gigBalance: { increment: pay } } });
          await tx.gig.update({ where: { id: gigId }, data: { status: "COMPLETED", completedAt: new Date() } });
          if (!isPosterAdmin) await tx.platformProfit.create({ data: { source: "GIG_CONFIRM_20", grossFee: fee, netFee: fee, refId: String(gigId), meta: { gigId, disputed: true, decision } } });
        });
        try { const { recordWalletMovement } = require("../utils/wallet"); await recordWalletMovement({ userId: gig.claimerId, direction: "CREDIT", amount: pay, fee: 0, type: "GIG_DISPUTE_RELEASE", title: "Dispute resolved — released", body: `Credit: ₦${(pay/100).toLocaleString()} released for gig #${gigId} (admin decision: release${isPosterAdmin ? ", admin free — no fee" : `, fee ₦${(fee/100).toLocaleString()}`}).`, meta: { gigId, adminFree: isPosterAdmin } }); } catch {}
      } else if (decision === "split") {
        const half = Math.floor(gig.escrowAmount/2);
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: gig.posterId }, data: { gigBalance: { increment: half } } });
          if (gig.claimerId) await tx.user.update({ where: { id: gig.claimerId }, data: { gigBalance: { increment: gig.escrowAmount - half } } });
          await tx.gig.update({ where: { id: gigId }, data: { status: "COMPLETED", completedAt: new Date() } });
        });
        try {
          const { recordWalletMovement } = require("../utils/wallet");
          await recordWalletMovement({ userId: gig.posterId, direction: "CREDIT", amount: half, fee: 0, type: "GIG_DISPUTE_SPLIT", title: "Dispute resolved — split", body: `Credit: ₦${(half/100).toLocaleString()} for gig #${gigId} (admin split).`, meta: { gigId } });
          if (gig.claimerId) await recordWalletMovement({ userId: gig.claimerId, direction: "CREDIT", amount: gig.escrowAmount - half, fee: 0, type: "GIG_DISPUTE_SPLIT", title: "Dispute resolved — split", body: `Credit: ₦${((gig.escrowAmount - half)/100).toLocaleString()} for gig #${gigId} (admin split).`, meta: { gigId } });
        } catch {}
      }
      // notify both
      try {
        await prisma.notification.createMany({ data: [
          { userId: gig.posterId, actorId: req.user.id, type: "GIG_DISPUTED_RESOLVED", listingId: null },
          ...(gig.claimerId ? [{ userId: gig.claimerId, actorId: req.user.id, type: "GIG_DISPUTED_RESOLVED", listingId: null }] : []),
        ]});
        const { emitNotification } = require("../realtime");
        emitNotification(gig.posterId, { type: "GIG_DISPUTED_RESOLVED" });
        if (gig.claimerId) emitNotification(gig.claimerId, { type: "GIG_DISPUTED_RESOLVED" });
      } catch {}
      return res.json({ message: `Gig #${gigId} resolved: ${decision}` });
    } else {
      const bookingId = parseInt(id,10);
      const booking = await prisma.serviceBooking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.status !== "DISPUTED") return res.status(400).json({ error: "Booking not in DISPUTED" });
      if (decision === "refund") {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: booking.bookerId }, data: { gigBalance: { increment: booking.amount } } });
          await tx.serviceBooking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
        });
        try { const { recordWalletMovement } = require("../utils/wallet"); await recordWalletMovement({ userId: booking.bookerId, direction: "CREDIT", amount: booking.amount, fee: 0, type: "SERVICE_DISPUTE_REFUND", title: "Service dispute — refunded", body: `Credit: ₦${(booking.amount/100).toLocaleString()} refunded for booking #${bookingId} (admin refund).`, meta: { bookingId } }); } catch {}
      } else if (decision === "release") {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: booking.providerId }, data: { gigBalance: { increment: booking.amount } } });
          await tx.serviceBooking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
        });
        try { const { recordWalletMovement } = require("../utils/wallet"); await recordWalletMovement({ userId: booking.providerId, direction: "CREDIT", amount: booking.amount, fee: 0, type: "SERVICE_DISPUTE_RELEASE", title: "Service dispute — released", body: `Credit: ₦${(booking.amount/100).toLocaleString()} released to provider for booking #${bookingId} (admin release).`, meta: { bookingId } }); } catch {}
      } else if (decision === "split") {
        const half = Math.floor(booking.amount/2);
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: booking.bookerId }, data: { gigBalance: { increment: half } } });
          await tx.user.update({ where: { id: booking.providerId }, data: { gigBalance: { increment: booking.amount - half } } });
          await tx.serviceBooking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
        });
        try {
          const { recordWalletMovement } = require("../utils/wallet");
          await recordWalletMovement({ userId: booking.bookerId, direction: "CREDIT", amount: half, fee: 0, type: "SERVICE_DISPUTE_SPLIT", title: "Service dispute — split", body: `Credit: ₦${(half/100).toLocaleString()} for booking #${bookingId} (admin split).`, meta: { bookingId } });
          await recordWalletMovement({ userId: booking.providerId, direction: "CREDIT", amount: booking.amount - half, fee: 0, type: "SERVICE_DISPUTE_SPLIT", title: "Service dispute — split", body: `Credit: ₦${((booking.amount - half)/100).toLocaleString()} for booking #${bookingId} (admin split).`, meta: { bookingId } });
        } catch {}
      }
      try {
        await prisma.notification.createMany({ data: [
          { userId: booking.bookerId, actorId: req.user.id, type: "SERVICE_DISPUTED_RESOLVED", listingId: booking.listingId },
          { userId: booking.providerId, actorId: req.user.id, type: "SERVICE_DISPUTED_RESOLVED", listingId: booking.listingId },
        ]});
        const { emitNotification } = require("../realtime");
        emitNotification(booking.bookerId, { type: "SERVICE_DISPUTED_RESOLVED", listingId: booking.listingId });
        emitNotification(booking.providerId, { type: "SERVICE_DISPUTED_RESOLVED", listingId: booking.listingId });
      } catch {}
      return res.json({ message: `Booking #${bookingId} resolved: ${decision}` });
    }
  } catch (err) {
    console.error("[DISPUTES RESOLVE ERROR]", err.message);
    return res.status(500).json({ error: "Could not resolve dispute" });
  }
});

module.exports = router;
