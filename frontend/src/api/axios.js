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
      // Only auto-clear for /auth/me — other 401s (e.g. login failure) should not wipe session
      const isMeRequest = error?.config?.url?.includes("/auth/me");
      if (hasToken && isMeRequest) {
        localStorage.removeItem("tt_token");
        localStorage.removeItem("tt_user");
      }
    }
    return Promise.reject(error);
  },
);

export default api;
