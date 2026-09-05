// src/hooks/useRealtime.js — Pusher first (free, no cold start), Socket fallback, polling already as last fallback
import { useEffect } from "react";
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

  useEffect(() => {
    if (!enabled) return;
    // Pusher (free, no Render sleep) — best
    const pusherOffs = [];
    const mainChannel = channelForEvent(event);
    if (mainChannel) pusherOffs.push(subscribePusher(mainChannel, event, callback));
    if (user?.id && (event.startsWith("notification") || event.startsWith("message") || event === "listing:self")) {
      pusherOffs.push(subscribePusher(`user-${user.id}`, event, callback));
      pusherOffs.push(subscribePusher("messages", event, callback));
      pusherOffs.push(subscribePusher("notifications", event, callback));
    }
    if (user?.role === "ADMIN" && event.startsWith("admin:")) {
      pusherOffs.push(subscribePusher("admin", event, callback));
    }

    // Socket fallback
    connectSocket();
    const offSocket = onRealtime(event, callback);

    // Service Worker push (when app is background/closed, SW shows notification and postMessages to clients)
    // This makes inbox/bell update even before you tap bell/inbox — no manual refresh
    const onSWMessage = (e) => {
      if (e.data?.type === "TRENDTRIBE_PUSH") {
        // any push means new message/notification → refresh
        if (event === "message" || event === "notification" || event === "notification:unread" || event === "message:unread") {
          callback(e.data.data);
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
  }, [event, callback, enabled, isAuthenticated, token, user?.id, user?.role]);
}
