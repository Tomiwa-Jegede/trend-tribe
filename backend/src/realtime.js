// src/realtime.js — Socket.IO real-time layer (JWT auth, rooms)
const { Server } = require("socket.io");
const { verifyToken } = require("./utils/jwt");
const prisma = require("./db");

let io = null;

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

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
    socket.on("disconnect", () => {});
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

const emitFavorite = (listingId, userId, favorited) => {
  try {
    const io = getIO();
    io.to("marketplace").emit("favorite", { listingId, userId, favorited });
    io.to("admin").emit("admin:favorite", { listingId, userId, favorited });
  } catch {}
  try { const { emitFavorite: p } = require("./pusher"); p(listingId, userId, favorited); } catch {}
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

module.exports = { initRealtime, getIO, emitListing, emitFavorite, emitNotification, emitMessage, emitInboxBroadcast };
