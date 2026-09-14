// src/hooks/useRealtime.js — Pusher first (free, no cold start), Socket fallback, polling already as last fallback
import { useEffect, useRef } from "react";
import { connectSocket, onRealtime } from "../services/socket";
import { subscribePusher } from "../services/pusherClient";
import { useAuth } from "../context/AuthContext";

const channelForEvent = (event) => {
  if (event.startsWith("admin:")) return "admin";
  if (event === "listing:self") return null;
  if (event.startsWith("notification") || event.startsWith("message") || event.startsWith("typing") || event.startsWith("presence")) return null;
  return "marketplace";
};

export default function useRealtime(event, callback, opts = {}) {
  const { isAuthenticated, token, user } = useAuth();
  const enabled = opts.enabled !== false;
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; }, [callback]);
  const lastFiredRef = useRef(new Map());

  useEffect(() => {
    if (!enabled) return;
    const handler = (...args) => {
      // Backend delivers most events over BOTH Pusher and Socket.IO to the
      // same client (see backend/src/realtime.js emitNotification etc.
      // alongside the direct io.emit calls) — dedupe near-simultaneous
      // duplicate deliveries of the identical payload so consumers
      // (badges, counts, lists) don't double-fire and flicker.
      let key;
      try { key = JSON.stringify(args); } catch { key = String(args.length); }
      const now = Date.now();
      const last = lastFiredRef.current.get(key) || 0;
      if (now - last < 1000) return;
      lastFiredRef.current.set(key, now);
      setTimeout(() => lastFiredRef.current.delete(key), 1000);
      cbRef.current?.(...args);
    };
    // Pusher (free, no Render sleep) — best
    const pusherOffs = [];
    const mainChannel = channelForEvent(event);
    if (mainChannel) pusherOffs.push(subscribePusher(mainChannel, event, handler));
    if (user?.id && (event.startsWith("notification") || event.startsWith("message") || event === "listing:self" || event.startsWith("typing") || event.startsWith("presence"))) {
      pusherOffs.push(subscribePusher(`user-${user.id}`, event, handler));
    }
    if (user?.role === "ADMIN" && event.startsWith("admin:")) {
      pusherOffs.push(subscribePusher("admin", event, handler));
    }

    // Socket fallback — ensure connected and authenticated before subscribing
    connectSocket();
    const offSocket = onRealtime(event, handler);

    // Service Worker push (when app is background/closed, SW shows notification and postMessages to clients)
    // This makes inbox/bell update even before you tap bell/inbox — no manual refresh
    const onSWMessage = (e) => {
      if (e.data?.type === "TRENDTRIBE_PUSH") {
        // any push means new message/notification → refresh
        if (event === "message" || event === "notification" || event === "notification:unread" || event === "message:unread") {
          handler(e.data.data);
        }
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSWMessage);
    }

    return () => {
      pusherOffs.forEach((off) => off && off());
      offSocket && offSocket();
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onSWMessage);
    };
  }, [event, enabled, isAuthenticated, token, user?.id, user?.role]);
}
