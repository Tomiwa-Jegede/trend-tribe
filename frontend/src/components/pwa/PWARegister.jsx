// src/components/pwa/PWARegister.jsx — registers Workbox SW + handles updates + badge + push resync
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { isPushSupported, subscribePush, setBadge, clearBadge } from "../../services/push";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function PWARegister() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // periodic check every hour + on visibility/focus so PWA picks up deploy on next open
      if (r) {
        const doUpdate = () => r.update().catch(() => {});
        const id = setInterval(doUpdate, 60 * 60 * 1000);
        const onVis = () => { if (document.visibilityState === "visible") doUpdate(); };
        const onFocus = () => doUpdate();
        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("focus", onFocus);
        // cleanup if component unmounts (though it's root)
        // store for HMR
        if (import.meta.hot) import.meta.hot.dispose(() => {
          clearInterval(id);
          document.removeEventListener("visibilitychange", onVis);
          window.removeEventListener("focus", onFocus);
        });
      }
      console.log("[PWA] SW registered", swUrl);
    },
    onRegistered(r) {
      // handled in onRegisteredSW above
      if (r) console.log("[PWA] SW registered (fallback)");
    },
    onRegisterError(e) {
      console.warn("[PWA] SW error", e);
    },
  });

  const { isAuthenticated } = useAuth();

  // Auto-resubscribe push if permission already granted (so push works when closed)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isPushSupported() || Notification.permission !== "granted") return;
    subscribePush().catch(() => {});
  }, [isAuthenticated]);

  // Keep app-icon badge in sync with unread notifications (where supported)
  // First open after push should register as seen — mark read + clear badge
  useEffect(() => {
    if (!("setAppBadge" in navigator) && !("clearAppBadge" in navigator)) return;
    let timer;
    let lastHiddenAt = 0;
    const markAllSeen = async () => {
      try {
        await Promise.all([
          api.post("/notifications/read-all").catch(() => {}),
          api.post("/messages/read-all").catch(() => {}),
        ]);
      } catch {}
    };
    const syncBadge = async ({ markSeenOnOpen = false } = {}) => {
      if (!isAuthenticated) {
        clearBadge();
        return;
      }
      try {
        const [n, m] = await Promise.all([
          api.get("/notifications/unread-count").then((r) => r.data.unreadCount).catch(() => 0),
          api.get("/messages/unread-count").then((r) => r.data.unreadCount).catch(() => 0),
        ]);
        const total = (n || 0) + (m || 0);
        if (total > 0) {
          // if app was hidden (push outside) and now visible, first open marks as seen
          if (markSeenOnOpen && Date.now() - lastHiddenAt < 30_000) {
            await markAllSeen();
            clearBadge();
            return;
          }
          setBadge(total);
        } else clearBadge();
      } catch {}
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") lastHiddenAt = Date.now();
      else syncBadge({ markSeenOnOpen: true });
    };
    const onFocus = () => syncBadge({ markSeenOnOpen: true });
    const onPushMsg = (e) => {
      if (e.data?.type === "TRENDTRIBE_PUSH") syncBadge({ markSeenOnOpen: false });
    };
    syncBadge();
    timer = setInterval(syncBadge, 30_000);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    navigator.serviceWorker?.addEventListener("message", onPushMsg);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      navigator.serviceWorker?.removeEventListener("message", onPushMsg);
    };
  }, [isAuthenticated]);

  // offline/online toast could be added here
  useEffect(() => {
    const onOffline = () => console.log("[PWA] offline");
    const onOnline = () => console.log("[PWA] online");
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!needRefresh) return null;
  return (
    <div className="fixed top-16 inset-x-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-50">
      <div className="rounded-xl bg-[#0F1F3D] text-white px-4 py-3 shadow-lg flex items-center gap-3">
        <span className="text-sm flex-1">New version available</span>
        <button onClick={() => updateServiceWorker(true)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white text-[#0F1F3D]">Reload</button>
        <button onClick={() => setNeedRefresh(false)} className="text-xs px-2 py-1 text-white/80">Later</button>
      </div>
    </div>
  );
}
