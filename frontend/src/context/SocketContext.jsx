// src/context/SocketContext.jsx — keeps socket alive and refreshes on auth change
import { useEffect } from "react";
import { connectSocket, disconnectSocket, refreshSocketAuth } from "../services/socket";
import { useAuth } from "./AuthContext";

export default function SocketProvider({ children }) {
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    connectSocket();
    return () => {};
  }, []);

  useEffect(() => {
    refreshSocketAuth();
    if (!isAuthenticated) {
      // keep socket for public feed (marketplace) even when logged out
      // don't disconnect, just refresh auth
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    // reconnect on visibility change (PWA resume)
    const onVis = () => { if (document.visibilityState === "visible") connectSocket(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  return children;
}
