// src/controllers/pwa.controller.js — track PWA installs/launches
const prisma = require("../db");

const getPlatform = (ua = "") => {
  const l = ua.toLowerCase();
  if (/android/.test(l)) return "android";
  if (/iphone|ipad|ipod/.test(l)) return "ios";
  if (/windows/.test(l)) return "windows";
  if (/mac/.test(l)) return "mac";
  return "unknown";
};

const logInstall = async (req, res) => {
  try {
    const { platform, displayMode, source } = req.body || {};
    const ua = req.headers["user-agent"] || "";
    const derivedPlatform = platform || getPlatform(ua);
    // dedup: 1 per user per day per source, or 1 per ip+ua per hour if anon
    const userId = req.user?.id || null;
    // simple throttle: if same user/source in last 10min skip
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const existing = await prisma.pWAInstall.findFirst({
      where: {
        userId: userId || undefined,
        source: source || undefined,
        createdAt: { gt: since },
      },
    });
    if (existing) return res.json({ ok: true, deduped: true });

    const row = await prisma.pWAInstall.create({
      data: {
        userId,
        platform: derivedPlatform,
        displayMode: displayMode || null,
        userAgent: ua.slice(0, 500),
        source: source || "unknown",
      },
    });
    return res.status(201).json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[PWA LOG ERROR]", err.message);
    return res.status(500).json({ error: "Failed to log" });
  }
};

const getStats = async (req, res) => {
  try {
    const total = await prisma.pWAInstall.count();
    const byPlatform = await prisma.pWAInstall.groupBy({ by: ["platform"], _count: { platform: true } });
    const bySource = await prisma.pWAInstall.groupBy({ by: ["source"], _count: { source: true } });
    const last7 = await prisma.pWAInstall.count({ where: { createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } });
    const byDay = await prisma.$queryRaw`
      SELECT to_char("createdAt"::date, 'YYYY-MM-DD') as day, COUNT(*)::int as count
      FROM "pwa_installs"
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day DESC LIMIT 14
    `;
    const uniqueUsers = await prisma.pWAInstall.groupBy({ by: ["userId"], _count: { userId: true }, where: { userId: { not: null } } });
    return res.json({
      total,
      last7Days: last7,
      uniqueLoggedInUsers: uniqueUsers.length,
      byPlatform: Object.fromEntries(byPlatform.map((r) => [r.platform || "unknown", r._count.platform])),
      bySource: Object.fromEntries(bySource.map((r) => [r.source || "unknown", r._count.source])),
      byDay,
    });
  } catch (err) {
    console.error("[PWA STATS ERROR]", err.message);
    return res.status(500).json({ error: "Failed" });
  }
};

module.exports = { logInstall, getStats };
