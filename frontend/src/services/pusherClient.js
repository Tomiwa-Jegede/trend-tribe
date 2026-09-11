// src/services/pusherClient.js — Pusher Channels (free tier, no Render cold start)
import Pusher from "pusher-js";
import config from "../config/env";

let pusher = null;
let channels = new Map();
let channelRefCounts = new Map(); // channelName -> number of bindings

const getPusher = () => {
  if (pusher) return pusher;
  const key = import.meta.env.VITE_PUSHER_KEY || config.pusherKey; // fallback
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER || config.pusherCluster || "eu";
  if (!key) {
    if (import.meta.env.DEV) console.log("[PUSHER] no key — skipping, fallback to polling/socket");
    return null;
  }
  Pusher.logToConsole = false;
  pusher = new Pusher(key, {
    cluster,
    forceTLS: true,
    enabledTransports: ["ws", "wss"],
    disabledTransports: [],
  });
  // optional: add auth for private channels later
  // pusher.config.authEndpoint = `${config.apiUrl}/pusher/auth`;
  return pusher;
};

export const subscribePusher = (channelName, event, cb) => {
  const p = getPusher();
  if (!p) return () => {};
  let ch = channels.get(channelName);
  if (!ch) {
    ch = p.subscribe(channelName);
    channels.set(channelName, ch);
  }
  ch.bind(event, cb);
  channelRefCounts.set(channelName, (channelRefCounts.get(channelName) || 0) + 1);
  return () => {
    try { ch.unbind(event, cb); } catch {}
    const next = (channelRefCounts.get(channelName) || 1) - 1;
    if (next <= 0) {
      channelRefCounts.delete(channelName);
      try { p.unsubscribe(channelName); } catch {}
      channels.delete(channelName);
    } else {
      channelRefCounts.set(channelName, next);
    }
  };
};

export const unsubscribePusher = (channelName, event, cb) => {
  const ch = channels.get(channelName);
  if (ch) ch.unbind(event, cb);
};

export const disconnectPusher = () => {
  if (pusher) { pusher.disconnect(); pusher = null; channels.clear(); }
};
