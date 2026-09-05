const prisma = require("../db");

// GET /api/messages — my inbox
const getMyMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [messages, totalCount, unreadCount] = await Promise.all([
      prisma.message.findMany({
        where: { recipientId: req.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          sender: { select: { id: true, username: true, fullName: true, role: true } },
          listing: { select: { id: true, title: true, images: true, price: true } },
        },
      }),
      prisma.message.count({ where: { recipientId: req.user.id } }),
      prisma.message.count({ where: { recipientId: req.user.id, read: false } }),
    ]);
    return res.status(200).json({ messages, unreadCount, pagination: { totalCount, totalPages: Math.ceil(totalCount / limitNum), currentPage: pageNum, limit: limitNum } });
  } catch (err) {
    console.error("[GET MESSAGES ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getMessageById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const msg = await prisma.message.findUnique({ where: { id }, include: { sender: { select: { id: true, username: true, role: true } }, listing: { select: { id: true, title: true, images: true, price: true } } } });
    if (!msg || msg.recipientId !== req.user.id) return res.status(404).json({ error: "Not found" });
    // auto-mark read when opened
    if (!msg.read) await prisma.message.update({ where: { id }, data: { read: true } }).catch(() => {});
    return res.status(200).json({ message: { ...msg, read: true } });
  } catch (err) {
    console.error("[GET MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const markRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg || msg.recipientId !== req.user.id) return res.status(404).json({ error: "Not found" });
    await prisma.message.update({ where: { id }, data: { read: true } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[MARK MESSAGE READ ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const markAllRead = async (req, res) => {
  try {
    await prisma.message.updateMany({ where: { recipientId: req.user.id, read: false }, data: { read: true } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[MARK ALL MESSAGES READ ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.message.count({ where: { recipientId: req.user.id, read: false } });
    return res.status(200).json({ unreadCount: count });
  } catch (err) {
    console.error("[UNREAD MESSAGE COUNT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg || msg.recipientId !== req.user.id) return res.status(404).json({ error: "Not found" });
    await prisma.message.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[DELETE MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteMany = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No ids" });
    const nums = ids.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n));
    await prisma.message.deleteMany({ where: { id: { in: nums }, recipientId: req.user.id } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[DELETE MANY MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteAll = async (req, res) => {
  try {
    await prisma.message.deleteMany({ where: { recipientId: req.user.id } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[DELETE ALL MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getMyMessages, getMessageById, markRead, markAllRead, getUnreadCount, deleteOne, deleteMany, deleteAll };
