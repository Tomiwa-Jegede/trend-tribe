// src/context/SocketContext.jsx — whole-site realtime (only when change, no random polling)
import { useEffect } from "react";
import { connectSocket, refreshSocketAuth } from "../services/socket";
import { useAuth } from "./AuthContext";

export default function SocketProvider({ children }) {
  const { isAuthenticated, token, user } = useAuth();

  useEffect(() => {
    connectSocket();
  }, []);

  useEffect(() => {
    refreshSocketAuth();
  }, [isAuthenticated, token, user?.id]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") { try { const s = connectSocket(); if (!s.connected) s.connect(); } catch {} } };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("pageshow", onVis);
    // PWA standalone throttles timers — wake socket aggressively when app is in use
    const health = setInterval(() => {
      try {
        const s = connectSocket();
        if (!s.connected) s.connect();
      } catch {}
    }, 8000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("pageshow", onVis);
      clearInterval(health);
    };
  }, []);

  return children;
}
