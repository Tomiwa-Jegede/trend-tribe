// src/pusher.js — Pusher Channels (free tier, no persistent socket to keep alive)
// Works even when Render sleeps: backend triggers via REST, Pusher delivers.
const Pusher = require("pusher");
const config = require("./config/env");

let pusher = null;

function getPusher() {
  if (pusher) return pusher;
  const { appId, key, secret, cluster } = config.pusher || {};
  if (!appId || !key || !secret) {
    return null; // not configured — caller should fallback
  }
  pusher = new Pusher({
    appId,
    key,
    secret,
    cluster: cluster || "eu",
    useTLS: true,
  });
  return pusher;
}

function trigger(channel, event, data) {
  try {
    const p = getPusher();
    if (!p) return;
    p.trigger(channel, event, data, (err) => {
      if (err && process.env.NODE_ENV !== "production") console.warn("[PUSHER trigger error]", err.message);
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[PUSHER error]", e.message);
  }
}

// ─── Helpers mirroring old realtime.js API but via Pusher ────────
const emitListing = (action, listing) => {
  trigger("marketplace", "listing", { action, listing });
  if (listing?.sellerId) trigger(`user-${listing.sellerId}`, "listing:self", { action, listing });
  trigger("admin", "admin:listing", { action, listing });
};

const emitFavorite = (listingId, userId, favorited) => {
  trigger("marketplace", "favorite", { listingId, userId, favorited });
  trigger("admin", "admin:favorite", { listingId, userId, favorited });
};

const emitNotification = (userId, notification) => {
  trigger(`user-${userId}`, "notification", notification);
  trigger(`user-${userId}`, "notification:unread", { userId });
};

const emitMessage = (recipientId, message) => {
  trigger(`user-${recipientId}`, "message", message);
  trigger(`user-${recipientId}`, "message:unread", { recipientId });
  // also public fallback for debugging (admin pattern)
  trigger("messages", "message", { ...message, recipientId });
};

module.exports = { getPusher, trigger, emitListing, emitFavorite, emitNotification, emitMessage };
