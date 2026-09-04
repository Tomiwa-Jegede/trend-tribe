// src/context/AuthContext.jsx — Global Auth State

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import useRealtimePolling from "../hooks/useRealtimePolling";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true on first load

  // ── On app load: restore cached session instantly, then sync
  // with the server in the background (handles balance/data
  // changes made on another device or tab) ────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem("tt_token");
    const savedUser = localStorage.getItem("tt_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem("tt_token");
        localStorage.removeItem("tt_user");
      }
    }
    setLoading(false);
  }, []);

  // ── Refresh user data from server ────────────────────────────
  // Never auto-logout: if /auth/me fails (network, 401, expired token)
  // we keep the cached session and just skip the refresh. Only explicit
  // logout() clears storage.
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("tt_token")) return;
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      localStorage.setItem("tt_user", JSON.stringify(data.user));
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[AuthContext refreshUser]", err?.response?.data || err.message);
      // keep existing cached user/token — do not logout
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  // Real-time: keep user (tokenBalance, profile, etc.) fresh every 30s + on focus
  useRealtimePolling(refreshUser, 30000, !!token);

  // ── Login: save token + user to state + localStorage ────────
  const login = (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem("tt_token", tokenValue);
    localStorage.setItem("tt_user", JSON.stringify(userData));
  };

  // ── Logout: clear everything ─────────────────────────────────
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("tt_token");
    localStorage.removeItem("tt_user");
  };

  const value = {
    user,
    setUser,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook — use this everywhere instead of useContext(AuthContext)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
