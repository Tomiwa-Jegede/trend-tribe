// src/hooks/usePWAInstall.js
import { useEffect, useState, useCallback } from "react";

export default function usePWAInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  });

  useEffect(() => {
    const onBefore = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = (e) => { if (e.matches) setInstalled(true); };
    mq.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent || "");
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
