// src/context/AuthContext.jsx — Global Auth State

import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true on first load

  // ── On app load: restore session from localStorage ──────────
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

  // ── Refresh user data from server ────────────────────────────
  const refreshUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      localStorage.setItem("tt_user", JSON.stringify(data.user));
    } catch {
      logout();
    }
  };

  const value = {
    user,
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
