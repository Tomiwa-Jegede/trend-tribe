const prisma = require("../db");

// GET /api/notifications — my bell feed (in-app pull, no email)
const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          listing: { select: { id: true, title: true, images: true, category: true } },
        },
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ]);

    // enrich with actor username via extra query if needed
    const actorIds = [...new Set(notifications.map((n) => n.actorId).filter(Boolean))];
    const actors = actorIds.length
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true, fullName: true } })
      : [];
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

    const enriched = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
      listing: n.listing,
      actor: n.actorId ? actorMap[n.actorId] || { id: n.actorId } : null,
    }));

    return res.status(200).json({
      notifications: enriched,
      unreadCount,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error("[GET NOTIFICATIONS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    return res.status(200).json({ unreadCount: count });
  } catch (err) {
    console.error("[UNREAD COUNT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const markRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user.id) return res.status(404).json({ error: "Not found" });
    await prisma.notification.update({ where: { id }, data: { read: true } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[MARK READ ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[MARK ALL READ ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user.id) return res.status(404).json({ error: "Not found" });
    await prisma.notification.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[DELETE NOTIF ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteMany = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No ids provided" });
    const numericIds = ids.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n));
    if (numericIds.length === 0) return res.status(400).json({ error: "Invalid ids" });
    await prisma.notification.deleteMany({ where: { id: { in: numericIds }, userId: req.user.id } });
    return res.status(200).json({ ok: true, deleted: numericIds.length });
  } catch (err) {
    console.error("[DELETE MANY NOTIF ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteAll = async (req, res) => {
  try {
    const result = await prisma.notification.deleteMany({ where: { userId: req.user.id } });
    return res.status(200).json({ ok: true, deleted: result.count });
  } catch (err) {
    console.error("[DELETE ALL NOTIF ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getMyNotifications, getUnreadCount, markRead, markAllRead, deleteOne, deleteMany, deleteAll };
