const prisma = require("../db");
const { emitMessage } = require("../realtime");

// POST /api/messages — send canned first contact (replaces WhatsApp jump)
const createMessage = async (req, res) => {
  try {
    const { listingId, body, subject } = req.body;
    const text = (body || "").trim().slice(0, 1000);
    if (!text) return res.status(400).json({ error: "Message body required" });
    const lid = listingId ? parseInt(listingId, 10) : null;
    let recipientId = req.body.recipientId ? parseInt(req.body.recipientId, 10) : (req.body.withId ? parseInt(req.body.withId, 10) : null);
    let listing = null;
    if (lid) {
      listing = await prisma.listing.findUnique({ where: { id: lid }, select: { id: true, sellerId: true, title: true } });
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      // for replies, recipient is the other participant (withUser), not always seller
      if (!recipientId || isNaN(recipientId)) {
        // initial contact: buyer -> seller
        if (listing.sellerId === req.user.id) return res.status(400).json({ error: "You cannot message your own listing" });
        recipientId = listing.sellerId;
      } else {
        // reply: ensure not sending to self
        if (recipientId === req.user.id) return res.status(400).json({ error: "Cannot message yourself" });
      }
    }
    if (!recipientId || isNaN(recipientId)) return res.status(400).json({ error: "Recipient required" });
    const msg = await prisma.message.create({
      data: { body: text, subject: subject || null, senderId: req.user.id, recipientId, listingId: lid },
      include: { sender: { select: { id: true, username: true, fullName: true } }, listing: { select: { id: true, title: true } } },
    });
    // track as contact view for social proof (fire-and-forget)
    if (lid) {
      prisma.listing.update({ where: { id: lid }, data: { contactViews: { increment: 1 } } }).then((u) => {
        try { const { emitContactView } = require("../realtime"); emitContactView(u.id, u.contactViews); } catch {}
      }).catch(() => {});
      prisma.contactView.create({ data: { listingId: lid, viewerId: req.user.id } }).catch(() => {});
    }
    try { emitMessage(recipientId, msg); } catch {}
    // push only if recipient is not online (app in background/closed) — if in-focus, rely on realtime + in-app toast
    const shouldPush = (() => { try { const { isOnline } = require("../realtime"); return !isOnline(recipientId); } catch { return true; } })();
    if (shouldPush) {
      prisma.message.count({ where: { recipientId, read: false } }).then((unread) => {
        const { sendPushToUser } = require("../utils/push");
        sendPushToUser(prisma, recipientId, {
          title: "Trend Tribe — New chat message",
          body: `${msg.sender.fullName || msg.sender.username}: ${text.slice(0, 80)}`,
          url: `/chat?thread=${lid}-${msg.senderId}`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          badgeCount: unread,
          tag: `chat-${msg.id}`,
        }).catch(() => {});
      }).catch(() => {});
    }
    return res.status(201).json({ message: msg });
  } catch (err) {
    console.error("[CREATE MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/messages — my inbox (both sent and received, so buyer sees his canned first contact)
const getMyMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const where = { OR: [{ recipientId: req.user.id }, { senderId: req.user.id }] };
    const [messages, totalCount, unreadCount] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          sender: { select: { id: true, username: true, fullName: true, role: true } },
          recipient: { select: { id: true, username: true, fullName: true } },
          listing: { select: { id: true, slug: true, title: true, images: true, price: true } },
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
    // chat only — exclude system/admin messages (those belong to Notifications inbox)
    const count = await prisma.message.count({
      where: { recipientId: req.user.id, read: false, listingId: { not: null }, sender: { role: { not: "ADMIN" } } },
    });
    return res.status(200).json({ unreadCount: count });
  } catch (err) {
    console.error("[UNREAD MESSAGE COUNT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getThread = async (req, res) => {
  try {
    const listingId = req.query.listingId ? parseInt(req.query.listingId, 10) : null;
    const withId = req.query.with ? parseInt(req.query.with, 10) : null;
    if (!listingId || !withId) return res.status(400).json({ error: "listingId and with required" });
    const where = {
      listingId,
      OR: [
        { senderId: req.user.id, recipientId: withId },
        { senderId: withId, recipientId: req.user.id },
      ],
    };
    const messages = await prisma.message.findMany({ where, orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { id: true, username: true, fullName: true } } } });
    // mark delivered when fetched by recipient
    const toMark = messages.filter((m) => m.recipientId === req.user.id && !m.deliveredAt).map((m) => m.id);
    if (toMark.length) {
      prisma.message.updateMany({ where: { id: { in: toMark } }, data: { deliveredAt: new Date() } }).then(() => {
        toMark.forEach((mid) => {
          prisma.message.findUnique({ where: { id: mid }, select: { senderId: true } }).then((mm) => {
            try { const { emitDelivered } = require("../realtime"); emitDelivered(mm.senderId, { messageId: mid }); } catch {}
          });
        });
      }).catch(() => {});
    }
    return res.status(200).json({ messages });
  } catch (err) {
    console.error("[GET THREAD ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const markDelivered = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg || msg.recipientId !== req.user.id) return res.status(404).json({ error: "Not found" });
    await prisma.message.update({ where: { id }, data: { deliveredAt: new Date() } });
    try { const { emitDelivered } = require("../realtime"); emitDelivered(msg.senderId, { messageId: id }); } catch {}
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[MARK DELIVERED ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getPresence = async (req, res) => {
  try {
    const ids = (req.query.ids || "").split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
    const { isOnline } = require("../realtime");
    const out = {};
    ids.forEach((id) => (out[id] = isOnline(id)));
    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/messages/conversations — per-seller chat rooms (person-to-person only, no directory)
// Only threads where a real user-to-user message exists (Contact Seller), excludes system/admin broadcasts
const getConversations = async (req, res) => {
  try {
    const msgs = await prisma.message.findMany({
      where: {
        OR: [{ senderId: req.user.id }, { recipientId: req.user.id }],
        listingId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        sender: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
        recipient: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
        listing: { select: { id: true, slug: true, title: true, images: true, price: true } },
      },
    });
    // exclude system/admin senders — those belong to Notifications inbox, not Chat
    const filtered = msgs.filter((m) => m.sender?.role !== "ADMIN" && m.recipient?.role !== "ADMIN");
    const map = new Map();
    for (const m of filtered) {
      const other = m.senderId === req.user.id ? m.recipient : m.sender;
      const otherId = other?.id;
      if (!otherId) continue;
      const key = `thread-${m.listingId}-${otherId}`;
      if (!map.has(key)) {
        const unread = filtered.filter((x) => x.listingId === m.listingId && x.senderId === otherId && x.recipientId === req.user.id && !x.read).length;
        map.set(key, { key, listing: m.listing, otherUser: other, lastMessage: m, unreadCount: unread, updatedAt: m.createdAt });
      }
    }
    const conversations = Array.from(map.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return res.status(200).json({ conversations });
  } catch (err) {
    console.error("[GET CONVERSATIONS ERROR]", err);
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

module.exports = { getMyMessages, getMessageById, markRead, markAllRead, getUnreadCount, deleteOne, deleteMany, deleteAll, createMessage, getThread, markDelivered, getPresence, getConversations };
