// src/hooks/useRealtime.js — Pusher first (free, no cold start), Socket fallback, polling already as last fallback
import { useEffect } from "react";
import { connectSocket, onRealtime } from "../services/socket";
import { subscribePusher } from "../services/pusherClient";
import { useAuth } from "../context/AuthContext";

const channelForEvent = (event) => {
  // map events to Pusher channels (public for now, private per-user also via user-* public for demo)
  if (event.startsWith("admin:")) return "admin";
  if (event.startsWith("notification") || event.startsWith("message") || event === "listing:self") {
    // user-specific — we subscribe to marketplace + all user-* is not scalable, so frontend subscribes to both
    // For now use marketplace + admin + user-* where userId known
    return null; // handled via user channel below
  }
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
    // user-specific channels
    if (user?.id && (event.startsWith("notification") || event.startsWith("message") || event === "listing:self")) {
      pusherOffs.push(subscribePusher(`user-${user.id}`, event, callback));
    }
    // also listen on admin channel if admin
    if (user?.role === "ADMIN" && event.startsWith("admin:")) {
      pusherOffs.push(subscribePusher("admin", event, callback));
    }

    // Socket fallback (self-hosted, may cold start) — also subscribe so either triggers
    connectSocket();
    const offSocket = onRealtime(event, callback);

    return () => {
      pusherOffs.forEach((off) => off && off());
      offSocket && offSocket();
    };
  }, [event, callback, enabled, isAuthenticated, token, user?.id, user?.role]);
}
