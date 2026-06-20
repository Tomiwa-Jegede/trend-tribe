// src/routes/admin.routes.js — Admin Route Foundation (Phase 1 placeholders only)

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../db");
const cloudinary = require("../config/cloudinary");

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
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.listing.count({ where: { isAvailable: true } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    return res.status(200).json({
      totalUsers,
      totalListings,
      activeListings,
      newUsers,
      newListings,
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
          price: true,
          isAvailable: true,
          createdAt: true,
          seller: { select: { username: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      listings: listings.map((l) => ({ ...l, price: parseFloat(l.price) })),
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
    const { search, page = 1, limit = 20 } = req.query;

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
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      users,
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

module.exports = router;
