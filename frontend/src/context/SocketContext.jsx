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
  }, []);

  return children;
}
