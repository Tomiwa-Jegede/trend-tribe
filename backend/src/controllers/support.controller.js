const prisma = require("../db");
const { emitMessage } = require("../realtime");

// POST /api/support/contact — user creates support message (listingId=null) — 3/day
const contact = async (req, res) => {
  try {
    const text = (req.body.message || req.body.body || "").trim().slice(0, 1000);
    if (!text) return res.status(400).json({ error: "Message required" });
    const userId = req.user.id;
    const dayStart = new Date(); dayStart.setHours(0,0,0,0);
    const countToday = await prisma.message.count({ where: { senderId: userId, listingId: null, createdAt: { gte: dayStart } } });
    if (countToday >= 3) return res.status(429).json({ error: "Limit 3 support messages per day — try again tomorrow" });
    // find top admin as recipient for inbox placement (but admin view lists by sender, not recipient)
    const topAdmin = await prisma.user.findFirst({ where: { username: "Jegede01" }, select: { id: true } });
    const adminId = topAdmin?.id || (await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } }))?.id;
    if (!adminId) return res.status(500).json({ error: "No admin available" });
    // ensure SupportThread exists
    await prisma.supportThread.upsert({ where: { userId }, create: { userId }, update: {} }).catch(()=>{});
    const msg = await prisma.message.create({
      data: { body: text, senderId: userId, recipientId: adminId, listingId: null },
      include: { sender: { select: { id: true, username: true, fullName: true } } },
    });
    try { emitMessage(adminId, msg); } catch {}
    // notify all admins via support channel
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      const { getIO } = require("../realtime");
      const io = getIO();
      admins.forEach(a=> { try { io.to(`user:${a.id}`).emit("support:new", { userId, messageId: msg.id }); } catch {} });
    } catch {}
    return res.status(201).json({ message: msg });
  } catch (err) {
    console.error("[SUPPORT CONTACT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/support/thread — user's own support thread
const getThread = async (req, res) => {
  try {
    const userId = req.user.id;
    const topAdmin = await prisma.user.findFirst({ where: { username: "Jegede01" }, select: { id: true } });
    const adminIds = (await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })).map(u=>u.id);
    const messages = await prisma.message.findMany({
      where: {
        listingId: null,
        OR: [
          { senderId: userId, recipientId: { in: adminIds } },
          { senderId: { in: adminIds }, recipientId: userId },
        ],
        AND: [
          { OR: [{ senderId: userId, senderDeleted: false }, { recipientId: userId, recipientDeleted: false }] },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { sender: { select: { id: true, username: true, fullName: true } } },
    });
    // mark delivered
    const toMark = messages.filter(m=>m.recipientId===userId && !m.deliveredAt).map(m=>m.id);
    if (toMark.length) prisma.message.updateMany({ where: { id: { in: toMark } }, data: { deliveredAt: new Date() } }).catch(()=>{});
    return res.status(200).json({ messages });
  } catch (err) {
    console.error("[SUPPORT GET THREAD ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/admin/support — list support threads grouped by user (admin only)
const listSupport = async (req, res) => {
  try {
    const msgs = await prisma.message.findMany({
      where: { listingId: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { sender: { select: { id: true, username: true, fullName: true, avatar: true } }, recipient: { select: { id: true, username: true } } },
    });
    // group by user (non-admin participant)
    const adminIds = new Set((await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })).map(u=>u.id));
    const map = new Map();
    for (const m of msgs) {
      const userId = adminIds.has(m.senderId) ? m.recipientId : m.senderId;
      if (adminIds.has(userId)) continue;
      if (!map.has(userId)) {
        const user = adminIds.has(m.senderId) ? m.recipient : m.sender;
        // fetch full user if needed
        const fullUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, fullName: true, avatar: true } }).catch(()=>user);
        map.set(userId, { userId, user: fullUser || user, lastMessage: m, messages: [] });
      }
    }
    // enrich with claim
    const threads = await prisma.supportThread.findMany({ include: { claimer: { select: { id: true, username: true, fullName: true } } } });
    const claimMap = new Map(threads.map(t=>[t.userId, t]));
    const result = Array.from(map.values()).map(v=>{
      const claim = claimMap.get(v.userId);
      return { ...v, claimedBy: claim?.claimedBy || null, claimer: claim?.claimer || null, claimedAt: claim?.claimedAt || null };
    });
    // sort by lastMessage desc
    result.sort((a,b)=> new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
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
    // CAS: only if not claimed
    const existing = await prisma.supportThread.findUnique({ where: { userId } });
    if (existing?.claimedBy) {
      const claimer = await prisma.user.findUnique({ where: { id: existing.claimedBy }, select: { username: true, fullName: true } });
      return res.status(409).json({ error: `Already claimed by ${claimer?.fullName || claimer?.username || "admin"}`, claimedBy: existing.claimedBy });
    }
    await prisma.supportThread.upsert({ where: { userId }, create: { userId, claimedBy: adminId, claimedAt: new Date() }, update: { claimedBy: adminId, claimedAt: new Date() } });
    // ensure not already claimed via race (check after)
    // auto hello
    const hello = `Hi, my name is ${admin.fullName || admin.username}.`;
    const msg = await prisma.message.create({ data: { body: hello, senderId: adminId, recipientId: userId, listingId: null }, include: { sender: { select: { id: true, username: true, fullName: true } } } });
    try { emitMessage(userId, msg); } catch {}
    // notify other admins that claimed
    try {
      const { getIO } = require("../realtime");
      const io = getIO();
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      admins.forEach(a=> { if (a.id!==adminId) try { io.to(`user:${a.id}`).emit("support:claimed", { userId, claimedBy: adminId, claimer: admin }); } catch {} });
    } catch {}
    return res.status(200).json({ claimed: true, message: msg });
  } catch (err) {
    console.error("[SUPPORT CONFIRM ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/admin/support/:userId/thread — admin fetch support thread for user
const adminGetThread = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });
    const adminIds = (await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })).map(u=>u.id);
    const messages = await prisma.message.findMany({
      where: { listingId: null, OR: [{ senderId: userId, recipientId: { in: adminIds } }, { senderId: { in: adminIds }, recipientId: userId }] },
      orderBy: { createdAt: "asc" }, take: 100,
      include: { sender: { select: { id: true, username: true, fullName: true } } },
    });
    return res.status(200).json({ messages });
  } catch (err) {
    console.error("[SUPPORT ADMIN GET THREAD ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/admin/support/:userId/message — admin replies in support thread
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
    const msg = await prisma.message.create({ data: { body: text, senderId: req.user.id, recipientId: userId, listingId: null }, include: { sender: { select: { id: true, username: true, fullName: true } } } });
    try { emitMessage(userId, msg); } catch {}
    return res.status(201).json({ message: msg });
  } catch (err) {
    console.error("[SUPPORT ADMIN REPLY ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { contact, getThread, listSupport, confirm, adminReply, adminGetThread };
