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
    // per-person Conversation (buyer,seller) — merge per-listing threads as per Ticket 02
    let conversationId = null;
    if (lid && listing) {
      const isSenderSeller = listing.sellerId === req.user.id;
      const buyerId = isSenderSeller ? recipientId : req.user.id;
      const sellerId = isSenderSeller ? req.user.id : listing.sellerId;
      // ensure buyer != seller (already checked) and create/find conversation
      const convo = await prisma.conversation.upsert({
        where: { buyerId_sellerId: { buyerId, sellerId } },
        create: { buyerId, sellerId, listingId: lid },
        update: { listingId: lid, lastMessageAt: new Date() },
      });
      conversationId = convo.id;
    }
    const msg = await prisma.message.create({
      data: { body: text, subject: subject || null, senderId: req.user.id, recipientId, listingId: lid, conversationId },
      include: { sender: { select: { id: true, username: true, fullName: true } }, listing: { select: { id: true, title: true } } },
    });
    console.log(`[CREATE MESSAGE] id=${msg.id} conv=${conversationId} listing=${lid} from=${req.user.id} to=${recipientId} bodyLen=${text.length}`);
    try { const { touchActive } = require("../realtime"); touchActive(req.user.id); } catch {}
    if (conversationId) {
      prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }).catch(() => {});
    }
    // track as contact view for social proof (fire-and-forget) — admin excluded
    if (lid && req.user.role !== "ADMIN") {
      prisma.listing.update({ where: { id: lid }, data: { contactViews: { increment: 1 } } }).then((u) => {
        try { const { emitContactView } = require("../realtime"); emitContactView(u.id, u.contactViews); } catch {}
      }).catch(() => {});
      prisma.contactView.create({ data: { listingId: lid, viewerId: req.user.id } }).catch(() => {});
    }
    try { emitMessage(recipientId, msg); } catch {}
    // Always send Web Push — PWA background throttles Pusher/Socket, so push wakes the SW
    // SW suppresses the visual notification when app is visible (avoids noise), still refreshes inbox via postMessage
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
    return res.status(201).json({ message: msg });
  } catch (err) {
    console.error("[CREATE MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/messages — my inbox (both sent and received, so buyer sees his canned first contact)
// soft-delete: each side hides via senderDeleted/recipientDeleted
const getMyMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const where = { OR: [{ recipientId: req.user.id, recipientDeleted: false }, { senderId: req.user.id, senderDeleted: false }] };
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
      prisma.message.count({ where: { recipientId: req.user.id, recipientDeleted: false } }),
      prisma.message.count({ where: { recipientId: req.user.id, recipientDeleted: false, read: false } }),
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
      where: { recipientId: req.user.id, recipientDeleted: false, read: false, listingId: { not: null }, sender: { role: { not: "ADMIN" } } },
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
    if (!withId) return res.status(400).json({ error: "with required" });
    // per-person Conversation first, but also include legacy per-listing messages that have no conversationId
    let conversation = null;
    if (listingId) {
      conversation = await prisma.conversation.findFirst({
        where: { OR: [{ buyerId: req.user.id, sellerId: withId }, { buyerId: withId, sellerId: req.user.id }] },
      });
    } else {
      conversation = await prisma.conversation.findFirst({
        where: { OR: [{ buyerId: req.user.id, sellerId: withId }, { buyerId: withId, sellerId: req.user.id }] },
      });
    }
    let where;
    if (conversation) {
      // per-listing isolation when listingId provided — prevents cross-listing leakage for same buyer/seller pair
      if (listingId) {
        where = {
          OR: [
            { AND: [{ conversationId: conversation.id }, { listingId }] },
            {
              listingId,
              conversationId: null,
              OR: [
                { senderId: req.user.id, recipientId: withId },
                { senderId: withId, recipientId: req.user.id },
              ],
            },
          ],
        };
      } else {
        where = { conversationId: conversation.id };
      }
    } else if (listingId) {
      where = {
        listingId,
        OR: [
          { senderId: req.user.id, recipientId: withId },
          { senderId: withId, recipientId: req.user.id },
        ],
      };
    } else {
      where = {
        OR: [
          { senderId: req.user.id, recipientId: withId },
          { senderId: withId, recipientId: req.user.id },
        ],
      };
    }
    // soft-delete visibility: only messages not deleted for this user
    const visibility = { OR: [{ senderId: req.user.id, senderDeleted: false }, { recipientId: req.user.id, recipientDeleted: false }] };
    const whereWithVisibility = { AND: [where, visibility] };
    const messages = await prisma.message.findMany({ where: whereWithVisibility, orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { id: true, username: true, fullName: true } } } });
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

const createConversation = async (req, res) => {
  try {
    const { listingId } = req.body;
    const lid = listingId ? parseInt(listingId, 10) : null;
    if (!lid) return res.status(400).json({ error: "listingId required" });
    const listing = await prisma.listing.findUnique({ where: { id: lid }, select: { id: true, sellerId: true, isAvailable: true } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (!listing.isAvailable) return res.status(400).json({ error: "Product no longer available" });
    if (listing.sellerId === req.user.id) return res.status(400).json({ error: "Cannot create chat with yourself" });
    const buyerId = req.user.id;
    const sellerId = listing.sellerId;
    const convo = await prisma.conversation.upsert({
      where: { buyerId_sellerId: { buyerId, sellerId } },
      create: { buyerId, sellerId, listingId: lid },
      update: { listingId: lid },
    });
    return res.status(200).json({ conversation: convo });
  } catch (err) {
    console.error("[CREATE CONVERSATION ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/messages/conversations — per-person chat rooms (merged, buyer,seller) via Conversation table
const getConversations = async (req, res) => {
  try {
    const convos = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }] },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: {
        buyer: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
        seller: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
        listing: { select: { id: true, slug: true, title: true, images: true, price: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    // include admin's own chats (e.g., Jegede01) — only filter pure system if both are ADMIN (not marketplace)
    const filtered = convos;
    const conversations = await Promise.all(filtered.map(async (c) => {
      const otherUser = c.buyerId === req.user.id ? c.seller : c.buyer;
      const unreadCount = await prisma.message.count({ where: { conversationId: c.id, recipientId: req.user.id, recipientDeleted: false, read: false } });
      const lastMessage = c.messages[0] || null;
      const key = `thread-${c.buyerId}-${c.sellerId}`;
      return { key, id: c.id, listing: c.listing, otherUser, lastMessage, unreadCount, updatedAt: c.lastMessageAt, buyerId: c.buyerId, sellerId: c.sellerId };
    }));
    // also include legacy per-listing threads not yet migrated (from Message without conversationId)
    const legacy = await prisma.message.findMany({
      where: { OR: [{ senderId: req.user.id, senderDeleted: false }, { recipientId: req.user.id, recipientDeleted: false }], listingId: { not: null }, conversationId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        sender: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
        recipient: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
        listing: { select: { id: true, slug: true, title: true, images: true, price: true } },
      },
    });
    const legacyFiltered = legacy;
    const map = new Map(conversations.map((c) => [c.key, c]));
    for (const m of legacyFiltered) {
      const other = m.senderId === req.user.id ? m.recipient : m.sender;
      const otherId = other?.id;
      if (!otherId) continue;
      const buyerId = m.senderId === m.listing?.sellerId ? m.recipientId : m.senderId === req.user.id && req.user.id !== m.listing?.sellerId ? req.user.id : otherId;
      // for legacy, approximate buyer/seller from listing
      const sellerId = m.listing?.sellerId || (m.senderId === req.user.id ? otherId : req.user.id);
      const bId = Math.min(buyerId, sellerId); // fallback, but per-person key should be buyer-seller
      // use per-listing key for legacy to avoid collision
      const key = `thread-${m.listingId}-${otherId}`;
      if (!map.has(key)) {
        const unread = legacyFiltered.filter((x) => x.listingId === m.listingId && x.senderId === otherId && x.recipientId === req.user.id && !x.read).length;
        map.set(key, { key, listing: m.listing, otherUser: other, lastMessage: m, unreadCount: unread, updatedAt: m.createdAt });
      }
    }
    const all = Array.from(map.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return res.status(200).json({ conversations: all });
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
    if (!msg || (msg.senderId !== req.user.id && msg.recipientId !== req.user.id)) return res.status(404).json({ error: "Not found" });
    const isSender = msg.senderId === req.user.id;
    const isRecipient = msg.recipientId === req.user.id;
    const data = {};
    if (isSender) data.senderDeleted = true;
    if (isRecipient) data.recipientDeleted = true;
    await prisma.message.update({ where: { id }, data });
    // hard delete only when both sides have deleted (no one needs it)
    const updated = await prisma.message.findUnique({ where: { id }, select: { senderDeleted: true, recipientDeleted: true } });
    if (updated?.senderDeleted && updated?.recipientDeleted) {
      await prisma.message.delete({ where: { id } }).catch(() => {});
    }
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
    // soft-delete for this user's side
    await prisma.message.updateMany({ where: { id: { in: nums }, senderId: req.user.id }, data: { senderDeleted: true } });
    await prisma.message.updateMany({ where: { id: { in: nums }, recipientId: req.user.id }, data: { recipientDeleted: true } });
    // clean up fully deleted
    await prisma.message.deleteMany({ where: { id: { in: nums }, senderDeleted: true, recipientDeleted: true } }).catch(() => {});
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[DELETE MANY MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteAll = async (req, res) => {
  try {
    await prisma.message.updateMany({ where: { senderId: req.user.id }, data: { senderDeleted: true } });
    await prisma.message.updateMany({ where: { recipientId: req.user.id }, data: { recipientDeleted: true } });
    await prisma.message.deleteMany({ where: { senderDeleted: true, recipientDeleted: true } }).catch(() => {});
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[DELETE ALL MESSAGE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteConversationsBulk = async (req, res) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) return res.status(400).json({ error: "No keys" });
    for (const key of keys) {
      if (typeof key !== "string" || !key.startsWith("thread-")) continue;
      const parts = key.replace("thread-", "").split("-").map((v) => parseInt(v, 10));
      if (parts.length !== 2 || parts.some(isNaN)) continue;
      const [a, b] = parts;
      // try per-person conversation first (buyer/seller)
      let convo = await prisma.conversation.findFirst({ where: { OR: [{ buyerId: a, sellerId: b }, { buyerId: b, sellerId: a }] } });
      if (convo && (convo.buyerId === req.user.id || convo.sellerId === req.user.id)) {
        await prisma.message.updateMany({ where: { conversationId: convo.id, OR: [{ senderId: req.user.id }, { recipientId: req.user.id }] }, data: { senderDeleted: true, recipientDeleted: true } });
        await prisma.message.deleteMany({ where: { conversationId: convo.id } }).catch(() => {});
        await prisma.conversation.delete({ where: { id: convo.id } }).catch(() => {});
      } else {
        // fallback per-listing: a=listingId, b=otherId
        const listingId = a, otherId = b;
        await prisma.message.updateMany({ where: { listingId, OR: [{ senderId: req.user.id, recipientId: otherId }, { senderId: otherId, recipientId: req.user.id }] }, data: { senderDeleted: true, recipientDeleted: true } });
        await prisma.message.deleteMany({ where: { listingId, OR: [{ senderId: req.user.id, recipientId: otherId }, { senderId: otherId, recipientId: req.user.id }] } }).catch(() => {});
      }
    }
    await prisma.message.deleteMany({ where: { senderDeleted: true, recipientDeleted: true } }).catch(() => {});
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[DELETE CONVERSATIONS BULK ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getMyMessages, getMessageById, markRead, markAllRead, getUnreadCount, deleteOne, deleteMany, deleteAll, deleteConversationsBulk, createMessage, getThread, markDelivered, getPresence, getConversations, createConversation };
