// src/services/socket.js — singleton Socket.IO client with JWT auto
import { io } from "socket.io-client";
import config from "../config/env";

let socket = null;
let listeners = new Map(); // event -> Set(callback)

const getToken = () => localStorage.getItem("tt_token");

const getSocketUrl = () => {
  // config.apiUrl is like https://trend-tribe.onrender.com/api -> strip /api
  try {
    const u = new URL(config.apiUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return window.location.origin;
  }
};

export const getSocket = () => socket;

export const connectSocket = () => {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  const url = getSocketUrl();
  socket = io(url, {
    auth: { token: getToken() },
    transports: ["polling", "websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 8000,
  });

  socket.on("connect", () => {
    if (import.meta.env.DEV) console.log("[SOCKET] connected", socket.id);
  });
  socket.on("disconnect", () => {
    if (import.meta.env.DEV) console.log("[SOCKET] disconnected");
  });
  socket.on("connect_error", (err) => {
    // suppress spam — server may be on old build or Render cold start, fallback to polling
    if (import.meta.env.DEV) console.warn("[SOCKET] connect_error", err.message);
  });

  // re-attach stored listeners
  for (const [evt, cbs] of listeners.entries()) {
    for (const cb of cbs) socket.on(evt, cb);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const onRealtime = (event, cb) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
  if (socket) socket.on(event, cb);
  return () => {
    listeners.get(event)?.delete(cb);
    if (socket) socket.off(event, cb);
  };
};

export const offRealtime = (event, cb) => {
  listeners.get(event)?.delete(cb);
  if (socket) socket.off(event, cb);
};

// helper to reconnect when token changes
export const refreshSocketAuth = () => {
  if (socket) {
    socket.auth = { token: getToken() };
    socket.disconnect().connect();
  }
};
