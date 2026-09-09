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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const hasToken = localStorage.getItem("tt_token");
      const isMeRequest = error?.config?.url?.includes("/auth/me");
      // Clear stale token on any 401 when token exists — fixes expired token showing as authed
      // Keep /auth/login 401 from clearing (invalid credentials shouldn't log out)
      const isLoginAttempt = error?.config?.url?.includes("/auth/login");
      if (hasToken && (isMeRequest || !isLoginAttempt)) {
        const errCode = error?.response?.data?.error || "";
        // Only clear on token-related 401s, not validation
        if (/token|expired|jwt|unauthorized|invalid/i.test(errCode) || isMeRequest || error?.config?.url?.includes("/auth/")) {
          localStorage.removeItem("tt_token");
          localStorage.removeItem("tt_user");
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
