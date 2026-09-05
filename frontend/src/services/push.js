// src/services/push.js — Web Push client
import api from "../api/axios";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
};

export const isPushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const getPermission = () => (isPushSupported() ? Notification.permission : "unsupported");

export const requestPermission = async () => {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return Notification.permission;
  }
};

export const subscribePush = async () => {
  if (!isPushSupported()) throw new Error("Push not supported");
  const perm = await requestPermission();
  if (perm !== "granted") throw new Error(perm === "denied" ? "Notifications blocked — enable in browser settings" : "Permission not granted");

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    // already subscribed — ensure server knows
    await syncSubscription(sub);
    return sub;
  }
  const { data } = await api.get("/push/vapid-public-key");
  const vapidPublicKey = data.publicKey;
  if (!vapidPublicKey) throw new Error("VAPID key missing");
  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  await syncSubscription(sub);
  return sub;
};

export const unsubscribePush = async () => {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await api.post("/push/unsubscribe", { endpoint }).catch(() => {});
  }
  // clear badge
  if ("clearAppBadge" in navigator) navigator.clearAppBadge().catch(() => {});
  else if ("setAppBadge" in navigator) navigator.setAppBadge(0).catch(() => {});
};

const syncSubscription = async (sub) => {
  const json = sub.toJSON();
  await api.post("/push/subscribe", {
    endpoint: json.endpoint,
    keys: json.keys,
    expirationTime: json.expirationTime || null,
  });
};

export const setBadge = (count) => {
  if ("setAppBadge" in navigator) {
    if (count > 0) navigator.setAppBadge(count).catch(() => {});
    else navigator.clearAppBadge?.().catch(() => navigator.setAppBadge(0).catch(() => {}));
  }
};

export const clearBadge = () => {
  if ("clearAppBadge" in navigator) navigator.clearAppBadge().catch(() => {});
  else if ("setAppBadge" in navigator) navigator.setAppBadge(0).catch(() => {});
};
