// src/context/AuthContext.jsx — Global Auth State

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import api from "../api/axios";
import useRealtimePolling from "../hooks/useRealtimePolling";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const posthog = usePostHog();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true on first load

  // ── On app load: restore cached session, validate token before marking ready
  // avoids flash of protected page with stale/invalid token (AuthContext loading)
  useEffect(() => {
    const savedToken = localStorage.getItem("tt_token");
    const savedUser = localStorage.getItem("tt_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("tt_token");
        localStorage.removeItem("tt_user");
        setLoading(false);
        return;
      }
      // keep loading true until /auth/me validates token
      api.get("/auth/me").then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("tt_user", JSON.stringify(data.user));
        if (posthog && data.user?.id) {
          posthog.identify(data.user.id.toString(), {
            email: data.user.email,
            username: data.user.username,
            role: data.user.role,
          });
        }
      }).catch((err) => {
        if (err?.response?.status === 401) {
          localStorage.removeItem("tt_token");
          localStorage.removeItem("tt_user");
          setToken(null);
          setUser(null);
        }
      }).finally(() => setLoading(false));
      return;
    }
    if (savedToken) {
      // token without user (edge) — validate
      setToken(savedToken);
      api.get("/auth/me").then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("tt_user", JSON.stringify(data.user));
        if (posthog && data.user?.id) {
          posthog.identify(data.user.id.toString(), {
            email: data.user.email,
            username: data.user.username,
            role: data.user.role,
          });
        }
      }).catch(() => {
        localStorage.removeItem("tt_token");
        setToken(null);
      }).finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, [posthog]);

  // ── Refresh user data from server ────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("tt_token")) return;
    const controller = new AbortController();
    try {
      const { data } = await api.get("/auth/me", { signal: controller.signal });
      setUser(data.user);
      localStorage.setItem("tt_user", JSON.stringify(data.user));
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      if (err?.response?.status === 401) {
        localStorage.removeItem("tt_token");
        localStorage.removeItem("tt_user");
        setToken(null);
        setUser(null);
        return;
      }
      if (import.meta.env.DEV) console.warn("[AuthContext refreshUser]", err?.response?.data || err.message);
    }
    return () => controller.abort();
  }, []);

  // ── Real-time: keep user fresh every 30s + on focus — skip while initial load, debounce focus
  useRealtimePolling(refreshUser, 30000, !!token && !loading);

  // ── Sync React state when axios's interceptor clears an expired/invalid
  // token from localStorage. Without this listener, localStorage and this
  // context's in-memory state can disagree indefinitely: the interceptor only
  // touches storage, so `isAuthenticated` would keep reporting true and
  // protected UI would stay mounted while every API call quietly 401s in the
  // background, with no redirect to login until the user manually refreshes.
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      if (posthog) posthog.reset();
    };
    window.addEventListener("tt:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("tt:auth-expired", handleAuthExpired);
  }, [posthog]);

  // ── Sliding refresh: backend sends x-new-token when <2d left, keep React state in sync
  useEffect(() => {
    const handleRefreshed = (e) => {
      const t = e.detail || localStorage.getItem("tt_token");
      if (t) setToken(t);
    };
    window.addEventListener("tt:auth-refreshed", handleRefreshed);
    return () => window.removeEventListener("tt:auth-refreshed", handleRefreshed);
  }, []);

  // ── Login: save token + user to state + localStorage ────────
  const login = (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem("tt_token", tokenValue);
    localStorage.setItem("tt_user", JSON.stringify(userData));
    if (posthog && userData?.id) {
      posthog.identify(userData.id.toString(), {
        email: userData.email,
        username: userData.username,
        role: userData.role,
      });
    }
  };

  // ── Logout: clear everything ─────────────────────────────────
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("tt_token");
    localStorage.removeItem("tt_user");
    if (posthog) posthog.reset();
  };

  const value = {
    user,
    setUser,
    token,
    loading,
    isAuthenticated: !!user && !!token && !loading,
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
