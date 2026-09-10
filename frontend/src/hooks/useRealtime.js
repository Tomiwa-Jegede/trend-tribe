// src/hooks/useRealtime.js — Pusher first (free, no cold start), Socket fallback, polling already as last fallback
import { useEffect, useRef } from "react";
import { connectSocket, onRealtime } from "../services/socket";
import { subscribePusher } from "../services/pusherClient";
import { useAuth } from "../context/AuthContext";

const channelForEvent = (event) => {
  if (event.startsWith("admin:")) return "admin";
  if (event === "listing:self") return null;
  if (event.startsWith("notification") || event.startsWith("message")) return null;
  return "marketplace";
};

export default function useRealtime(event, callback, opts = {}) {
  const { isAuthenticated, token, user } = useAuth();
  const enabled = opts.enabled !== false;
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (...args) => cbRef.current?.(...args);
    // Pusher (free, no Render sleep) — best
    const pusherOffs = [];
    const mainChannel = channelForEvent(event);
    if (mainChannel) pusherOffs.push(subscribePusher(mainChannel, event, handler));
    if (user?.id && (event.startsWith("notification") || event.startsWith("message") || event === "listing:self")) {
      pusherOffs.push(subscribePusher(`user-${user.id}`, event, handler));
      pusherOffs.push(subscribePusher("messages", event, handler));
      pusherOffs.push(subscribePusher("notifications", event, handler));
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
