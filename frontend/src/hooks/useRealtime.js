// src/hooks/useRealtime.js — subscribe to socket events with auto-connect
import { useEffect } from "react";
import { connectSocket, onRealtime } from "../services/socket";
import { useAuth } from "../context/AuthContext";

export default function useRealtime(event, callback, opts = {}) {
  const { isAuthenticated, token } = useAuth();
  const enabled = opts.enabled !== false;

  useEffect(() => {
    if (!enabled) return;
    // connect when authenticated or for public marketplace (always)
    connectSocket();
    const off = onRealtime(event, callback);
    return off;
  }, [event, callback, enabled, isAuthenticated, token]);
}
