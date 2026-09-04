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
// No auto-logout: session persists until user explicitly logs out.
// 401s are just rejected so callers can handle them (e.g. show login prompt)
// without wiping localStorage or hard-redirecting.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
