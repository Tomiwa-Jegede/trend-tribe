// src/routes/stats.routes.js — public hero stats + whatsapp manual
const express = require("express");
const prisma = require("../db");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

// GET /api/stats — public, cached 60s, real-time via socket — admin excluded (testing)
router.get("/", async (req, res) => {
  try {
    const [activeListings, totalUsers, siteConfig] = await Promise.all([
      prisma.listing.count({ where: { isAvailable: true, archivedAt: null, seller: { role: { not: "ADMIN" } } } }),
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.siteConfig.findUnique({ where: { id: 1 } }).catch(() => null),
    ]);
    res.set("Cache-Control", "public, max-age=60");
    return res.json({
      activeListings,
      totalUsers,
      whatsappMembers: siteConfig?.whatsappMembers ?? 63,
      updatedAt: siteConfig?.updatedAt || new Date().toISOString(),
    });
  } catch (e) {
    console.error("[stats]", e.message);
    return res.status(500).json({ error: "Could not load stats" });
  }
});

// PUT /api/stats/whatsapp — admin manual update, emits realtime
router.put("/whatsapp", protect, requireAdmin, async (req, res) => {
  const { count } = req.body;
  const n = parseInt(count, 10);
  if (!Number.isFinite(n) || n < 0 || n > 100000) {
    return res.status(400).json({ error: "count must be 0-100000" });
  }
  const updated = await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: { whatsappMembers: n },
    create: { id: 1, whatsappMembers: n },
  });
  // emit to all for hero live update (socket + pusher for Render sleep)
  try {
    const { getIO } = require("../realtime");
    const io = getIO();
    if (io) io.emit("stats:update", { whatsappMembers: n, updatedAt: updated.updatedAt });
  } catch {}
  try {
    const { trigger } = require("../pusher");
    trigger("marketplace", "stats:update", { whatsappMembers: n, updatedAt: updated.updatedAt });
  } catch {}
  return res.json(updated);
});

module.exports = router;
