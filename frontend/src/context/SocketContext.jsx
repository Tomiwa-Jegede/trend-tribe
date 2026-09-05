// src/context/SocketContext.jsx — admin-only realtime (no wss spam for normal users)
import { useEffect } from "react";
import { connectSocket, disconnectSocket, refreshSocketAuth } from "../services/socket";
import { useAuth } from "./AuthContext";

export default function SocketProvider({ children }) {
  const { isAuthenticated, user, token } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) { disconnectSocket(); return; }
    connectSocket();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    refreshSocketAuth();
  }, [isAdmin, isAuthenticated, token]);

  useEffect(() => {
    if (!isAdmin) return;
    const onVis = () => { if (document.visibilityState === "visible") connectSocket(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    const health = setInterval(() => {
      try {
        const s = connectSocket();
        if (!s.connected) s.connect();
      } catch {}
    }, 15000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      clearInterval(health);
    };
  }, [isAdmin]);

  return children;
}
