// src/api/axios.js — Configured Axios Instance (env-driven)

import axios from "axios";
import config from "../config/env";

const api = axios.create({
  baseURL: config.apiUrl, // ← was hardcoded '/api', now reads from .env
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ─── Request Interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (cfg) => {
    const token = localStorage.getItem("tt_token");
    if (token) {
      cfg.headers.Authorization = `Bearer ${token}`;
    }
    return cfg;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────
// When we clear the token here, also broadcast an event so any mounted
// AuthContext can sync its React state. Without this, AuthContext's `token`/
// `user` state (a separate source of truth from localStorage) stays stale —
// isAuthenticated keeps reporting true, protected UI stays visible, and every
// subsequent request just silently 401s with no redirect to login. The event
// makes localStorage and React state agree the moment either one changes.
const broadcastAuthExpired = () => {
  try { window.dispatchEvent(new CustomEvent("tt:auth-expired")); } catch {}
};

api.interceptors.response.use(
  (response) => {
    const newToken = response.headers?.["x-new-token"];
    if (newToken) {
      localStorage.setItem("tt_token", newToken);
      try { window.dispatchEvent(new CustomEvent("tt:auth-refreshed", { detail: newToken })); } catch {}
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      const hasToken = localStorage.getItem("tt_token");
      const url = error?.config?.url || "";
      const isMeRequest = url.includes("/auth/me");
      const isLoginAttempt = url.includes("/auth/login");
      // isMeRequest 401 is definitive token invalid even if body empty; otherwise only clear on explicit token signals
      if (hasToken && isMeRequest) {
        localStorage.removeItem("tt_token");
        localStorage.removeItem("tt_user");
        broadcastAuthExpired();
      } else if (hasToken && !isLoginAttempt) {
        const errCode = error?.response?.data?.error || "";
        if (/token|expired|jwt|session/i.test(errCode)) {
          localStorage.removeItem("tt_token");
          localStorage.removeItem("tt_user");
          broadcastAuthExpired();
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
