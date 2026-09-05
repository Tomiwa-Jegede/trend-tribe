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
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    // re-join marketplace automatically server does
  });
  socket.on("disconnect", () => {});
  socket.on("connect_error", () => {});

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
