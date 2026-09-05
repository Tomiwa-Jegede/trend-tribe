// src/hooks/usePWAInstall.js
import { useEffect, useState, useCallback } from "react";
import { logPWAInstalled, logPWALaunch } from "../services/pwaAnalytics";

export default function usePWAInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  });

  useEffect(() => {
    // log standalone launches (installed PWA opened) — once per day
    logPWALaunch();

    const onBefore = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      // monitor install count
      const ua = navigator.userAgent || "";
      let platform = "unknown";
      if (/android/i.test(ua)) platform = "android";
      else if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) platform = "ios";
      logPWAInstalled(platform, "appinstalled");
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = (e) => { if (e.matches) { setInstalled(true); logPWALaunch(); } };
    mq.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  // iOS detection that also catches iPadOS 13+ (MacIntel + touch) and Chrome on iOS (CriOS)
  const isIOS = (() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const maxTouch = navigator.maxTouchPoints || 0;
    return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && maxTouch > 1) || /CriOS|FxiOS/.test(ua);
  })();
  const isStandalone = installed;

  const canInstall = !!deferred && !installed;
  const isIOSInstallable = isIOS && !installed;

  const promptInstall = useCallback(async () => {
    if (!deferred) return { outcome: "unavailable" };
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setDeferred(null);
    return choice;
  }, [deferred]);

  return { deferred, installed: isStandalone, canInstall, isIOS, isIOSInstallable, promptInstall };
}
