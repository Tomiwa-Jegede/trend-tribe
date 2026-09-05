// src/services/pwaAnalytics.js — fire-and-forget PWA install/launch logging
import api from "../api/axios";

const post = (path, data) => {
  // use sendBeacon if available for unload, else fetch via api
  try {
    api.post(path, data).catch(() => {});
    if (typeof window.gtag === "function") {
      window.gtag("event", path.includes("installed") ? "pwa_installed" : "pwa_launch", {
        platform: data.platform || "unknown",
        source: data.source || "unknown",
        display_mode: data.displayMode || "unknown",
      });
    }
  } catch {}
};

export const logPWAInstalled = (platform, source = "appinstalled") => {
  const key = `tt_pwa_logged_installed_${new Date().toISOString().slice(0, 10)}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  const displayMode = window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser";
  post("/pwa/installed", { platform, displayMode, source });
};

export const logPWALaunch = () => {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (!isStandalone) return;
  const key = `tt_pwa_launch_${new Date().toISOString().slice(0, 10)}`;
  // once per day per device
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  // also throttle via localStorage per day
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  const ua = navigator.userAgent || "";
  let platform = "unknown";
  if (/android/i.test(ua)) platform = "android";
  else if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) platform = "ios";
  else if (/windows/i.test(ua)) platform = "windows";
  else if (/mac/i.test(ua)) platform = "mac";
  post("/pwa/launch", { platform, displayMode: "standalone", source: "standalone_launch" });
};
