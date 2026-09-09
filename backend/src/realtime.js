// src/realtime.js — Socket.IO real-time layer (JWT auth, rooms)
const { Server } = require("socket.io");
const { verifyToken } = require("./utils/jwt");
const prisma = require("./db");

let io = null;
const onlineCounts = new Map(); // userId -> socket count
const lastSeen = new Map(); // userId -> Date

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
function isOnline(userId) { return (onlineCounts.get(userId) || 0) > 0; }
function getPresence(userId) { return { userId, online: isOnline(userId), lastSeen: lastSeen.get(userId) || null }; }

function initRealtime(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Auth middleware — token in auth.token or query token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        socket.user = null; // allow anon for public marketplace feeds
        return next();
      }
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, role: true },
      });
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      // join personal room for private events
      socket.join(`user:${user.id}`);
      if (user.role === "ADMIN") socket.join("admin");
      next();
    } catch (e) {
      // don't block anon, just mark unauth
      socket.user = null;
      next();
    }
  });

  io.on("connection", (socket) => {
    // client can join public rooms explicitly if needed
    socket.on("join:marketplace", () => socket.join("marketplace"));
    socket.on("leave:marketplace", () => socket.leave("marketplace"));
    // auto-join marketplace for all
    socket.join("marketplace");
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SOCKET] ${socket.id} connected user:${socket.user?.id || "anon"}`);
    }
    // presence: track online
    if (socket.user?.id) {
      const c = (onlineCounts.get(socket.user.id) || 0) + 1;
      onlineCounts.set(socket.user.id, c);
      lastSeen.set(socket.user.id, new Date());
      io.emit("presence", { userId: socket.user.id, online: true, lastSeen: new Date() });
      try { const { emitPresence } = require("./pusher"); emitPresence(socket.user.id, true); } catch {}
    }
    // typing: ephemeral, no DB
    socket.on("typing:start", ({ to, listingId }) => {
      if (!socket.user?.id || !to) return;
      io.to(`user:${to}`).emit("typing", { from: socket.user.id, listingId, typing: true });
      try { const { emitTyping } = require("./pusher"); emitTyping(to, { from: socket.user.id, listingId, typing: true }); } catch {}
    });
    socket.on("typing:stop", ({ to, listingId }) => {
      if (!socket.user?.id || !to) return;
      io.to(`user:${to}`).emit("typing", { from: socket.user.id, listingId, typing: false });
      try { const { emitTyping } = require("./pusher"); emitTyping(to, { from: socket.user.id, listingId, typing: false }); } catch {}
    });
    // delivered/read receipts
    socket.on("message:delivered", async ({ messageId }) => {
      try {
        const mid = parseInt(messageId, 10);
        if (isNaN(mid)) return;
        const msg = await prisma.message.findUnique({ where: { id: mid }, select: { id: true, senderId: true, recipientId: true } });
        if (!msg || msg.recipientId !== socket.user?.id) return;
        await prisma.message.update({ where: { id: mid }, data: { deliveredAt: new Date() } }).catch(() => {});
        io.to(`user:${msg.senderId}`).emit("message:delivered", { messageId: mid, deliveredAt: new Date() });
        try { const { emitDelivered } = require("./pusher"); emitDelivered(msg.senderId, { messageId: mid }); } catch {}
      } catch {}
    });
    socket.on("message:read", async ({ messageId, listingId }) => {
      try {
        if (messageId) {
          const mid = parseInt(messageId, 10);
          const msg = await prisma.message.findUnique({ where: { id: mid }, select: { senderId: true, recipientId: true } });
          if (!msg || msg.recipientId !== socket.user?.id) return;
          await prisma.message.update({ where: { id: mid }, data: { read: true } }).catch(() => {});
          io.to(`user:${msg.senderId}`).emit("message:read", { messageId: mid, listingId });
          try { const { emitRead } = require("./pusher"); emitRead(msg.senderId, { messageId: mid, listingId }); } catch {}
        } else if (listingId) {
          const lid = parseInt(listingId, 10);
          await prisma.message.updateMany({ where: { listingId: lid, recipientId: socket.user.id, read: false }, data: { read: true } });
          io.to(`user:${socket.user.id}`).emit("message:read", { listingId: lid });
          // also notify senders — find distinct senders
          const msgs = await prisma.message.findMany({ where: { listingId: lid, recipientId: socket.user.id }, select: { senderId: true } });
          const senders = [...new Set(msgs.map((m) => m.senderId))];
          senders.forEach((sid) => io.to(`user:${sid}`).emit("message:read", { listingId: lid }));
        }
      } catch {}
    });
    socket.on("disconnect", () => {
      if (socket.user?.id) {
        const c = Math.max(0, (onlineCounts.get(socket.user.id) || 1) - 1);
        if (c === 0) {
          onlineCounts.delete(socket.user.id);
          lastSeen.set(socket.user.id, new Date());
          io.emit("presence", { userId: socket.user.id, online: false, lastSeen: new Date() });
          try { const { emitPresence } = require("./pusher"); emitPresence(socket.user.id, false); } catch {}
        } else {
          onlineCounts.set(socket.user.id, c);
        }
      }
    });
  });

  return io;
}

// ─── Emit helpers ──────────────────────────────────────────────
const emitListing = (action, listing) => {
  try {
    const io = getIO();
    io.to("marketplace").emit("listing", { action, listing });
    if (listing?.sellerId) io.to(`user:${listing.sellerId}`).emit("listing:self", { action, listing });
    io.to("admin").emit("admin:listing", { action, listing });
  } catch {}
  try { const { emitListing: p } = require("./pusher"); p(action, listing); } catch {}
};

const emitFavorite = (listingId, userId, favorited, favoriteCount = null) => {
  try {
    const io = getIO();
    const data = favoriteCount !== null ? { listingId, userId, favorited, favoriteCount } : { listingId, userId, favorited };
    io.to("marketplace").emit("favorite", data);
    io.emit("favorite", data);
    io.to("admin").emit("admin:favorite", data);
  } catch {}
  try { const { emitFavorite: p } = require("./pusher"); p(listingId, userId, favorited, favoriteCount); } catch {}
};

const emitNotification = (userId, notification) => {
  try {
    getIO().to(`user:${userId}`).emit("notification", notification);
    getIO().to(`user:${userId}`).emit("notification:unread", { userId });
  } catch {}
  try { const { emitNotification: p } = require("./pusher"); p(userId, notification); } catch {}
};

const emitMessage = (recipientId, message) => {
  try {
    getIO().to(`user:${recipientId}`).emit("message", message);
    getIO().to(`user:${recipientId}`).emit("message:unread", { recipientId });
  } catch {}
  try { const { emitMessage: p } = require("./pusher"); p(recipientId, message); } catch {}
};

const emitInboxBroadcast = (message) => {
  try {
    getIO().emit("message", message);
  } catch {}
};

const emitListingView = (listingId, views) => {
  try {
    const io = getIO();
    io.to("marketplace").emit("listing:viewed", { listingId, views });
    // also notify seller privately
    io.emit("listing:viewed", { listingId, views });
  } catch {}
  try { const { emitListingView: p } = require("./pusher"); if (p) p(listingId, views); } catch {}
};

const emitListingShare = (listingId, shares) => {
  try {
    const io = getIO();
    io.to("marketplace").emit("listing:shared", { listingId, shares });
    io.emit("listing:shared", { listingId, shares });
  } catch {}
  try { const { emitListingShare: p } = require("./pusher"); if (p) p(listingId, shares); } catch {}
};

const emitContactView = (listingId, contactViews) => {
  try {
    const io = getIO();
    io.to("marketplace").emit("listing:contacted", { listingId, contactViews });
    io.emit("listing:contacted", { listingId, contactViews });
  } catch {}
  try { const { emitContactView: p } = require("./pusher"); if (p) p(listingId, contactViews); } catch {}
};

const emitPresence = (userId, online) => {
  try { getIO().emit("presence", { userId, online, lastSeen: lastSeen.get(userId) || new Date() }); } catch {}
};
const emitTyping = (to, data) => {
  try { getIO().to(`user:${to}`).emit("typing", data); } catch {}
};
const emitDelivered = (userId, data) => {
  try { getIO().to(`user:${userId}`).emit("message:delivered", data); } catch {}
};
const emitRead = (userId, data) => {
  try { getIO().to(`user:${userId}`).emit("message:read", data); } catch {}
};

module.exports = { initRealtime, getIO, isOnline, getPresence, emitListing, emitFavorite, emitNotification, emitMessage, emitInboxBroadcast, emitListingView, emitListingShare, emitContactView, emitPresence, emitTyping, emitDelivered, emitRead };
