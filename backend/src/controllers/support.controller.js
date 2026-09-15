const prisma = require("../db");

// POST /api/support/contact — WhatsApp-only: support via WhatsApp, no in-app Message table
const contact = async (req, res) => {
  try {
    const text = (req.body.message || req.body.body || "").trim().slice(0, 1000);
    if (!text) return res.status(400).json({ error: "Message required" });
    const userId = req.user.id;
    // Messages table dropped — support now via WhatsApp. Keep SupportThread for claim tracking.
    await prisma.supportThread.upsert({ where: { userId }, create: { userId }, update: {} }).catch(()=>{});
    // Notify admins via realtime + Notification (no Message)
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      const { getIO } = require("../realtime");
      const io = getIO();
      admins.forEach(a=> { try { io.to(`user:${a.id}`).emit("support:new", { userId, preview: text.slice(0,80) }); } catch {} });
      await prisma.notification.createMany({ data: admins.map(a=>({ userId: a.id, actorId: userId, type: "SUPPORT_MESSAGE" })) }).catch(()=>{});
    } catch {}
    return res.status(201).json({ message: { body: text, senderId: userId, createdAt: new Date() } });
  } catch (err) {
    console.error("[SUPPORT CONTACT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/support/thread — WhatsApp-only: no Message history, return empty
const getThread = async (req, res) => {
  try {
    return res.status(200).json({ messages: [] });
  } catch (err) {
    console.error("[SUPPORT GET THREAD ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/admin/support — WhatsApp-only: list SupportThreads only, no Message history
const listSupport = async (req, res) => {
  try {
    const threads = await prisma.supportThread.findMany({ include: { claimer: { select: { id: true, username: true, fullName: true } }, user: { select: { id: true, username: true, fullName: true, avatar: true } } } });
    const result = threads.map(t=>({ userId: t.userId, user: t.user, claimedBy: t.claimedBy, claimer: t.claimer, claimedAt: t.claimedAt, lastMessage: null }));
    return res.status(200).json({ threads: result });
  } catch (err) {
    console.error("[SUPPORT LIST ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/admin/support/:userId/confirm — claim thread First wins, auto hello
const confirm = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });
    const adminId = req.user.id;
    const admin = req.user;
    // True atomic CAS. The old code read the thread, checked claimedBy in JS, then did a
    // separate upsert — two admins clicking "claim" in the same instant could both pass
    // the read-check and both upsert themselves as claimer, both firing an auto-hello.
    // Fix: attempt a real create first (unique on userId means only one request's create
    // can win at the DB level); if the row already exists, fall back to a single
    // conditional UPDATE ... WHERE claimedBy IS NULL, whose affected-row count tells us
    // — atomically — whether *this* request actually won the claim.
    let won = false;
    try {
      await prisma.supportThread.create({ data: { userId, claimedBy: adminId, claimedAt: new Date() } });
      won = true;
    } catch (e) {
      if (e.code !== "P2002") throw e; // not a unique-constraint clash, rethrow
      const claim = await prisma.supportThread.updateMany({ where: { userId, claimedBy: null }, data: { claimedBy: adminId, claimedAt: new Date() } });
      won = claim.count > 0;
    }
    if (!won) {
      const existing = await prisma.supportThread.findUnique({ where: { userId } });
      const claimer = existing?.claimedBy ? await prisma.user.findUnique({ where: { id: existing.claimedBy }, select: { username: true, fullName: true } }) : null;
      return res.status(409).json({ error: `Already claimed by ${claimer?.fullName || claimer?.username || "admin"}`, claimedBy: existing?.claimedBy });
    }
    // auto hello — no Message table, just Notification
    try { await prisma.notification.create({ data: { userId, actorId: adminId, type: "SUPPORT_CLAIMED" } }).catch(()=>{}); } catch {}
    // notify other admins that claimed
    try {
      const { getIO } = require("../realtime");
      const io = getIO();
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      admins.forEach(a=> { if (a.id!==adminId) try { io.to(`user:${a.id}`).emit("support:claimed", { userId, claimedBy: adminId, claimer: admin }); } catch {} });
    } catch {}
    return res.status(200).json({ claimed: true });
  } catch (err) {
    console.error("[SUPPORT CONFIRM ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/admin/support/:userId/thread — WhatsApp-only: no history
const adminGetThread = async (req, res) => {
  try {
    return res.status(200).json({ messages: [] });
  } catch (err) {
    console.error("[SUPPORT ADMIN GET THREAD ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/admin/support/:userId/message — WhatsApp-only: no Message, just Notification
const adminReply = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const text = (req.body.message || req.body.body || "").trim().slice(0, 1000);
    if (!text) return res.status(400).json({ error: "Message required" });
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });
    const thread = await prisma.supportThread.findUnique({ where: { userId } });
    if (thread?.claimedBy && thread.claimedBy !== req.user.id) {
      return res.status(403).json({ error: "Thread claimed by another admin" });
    }
    try { await prisma.notification.create({ data: { userId, actorId: req.user.id, type: "SUPPORT_REPLY" } }).catch(()=>{}); } catch {}
    return res.status(201).json({ message: { body: text, senderId: req.user.id, createdAt: new Date() } });
  } catch (err) {
    console.error("[SUPPORT ADMIN REPLY ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { contact, getThread, listSupport, confirm, adminReply, adminGetThread };
