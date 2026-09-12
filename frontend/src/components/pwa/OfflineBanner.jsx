// src/components/pwa/OfflineBanner.jsx — offline detection + fallback UI
import { useState, useEffect } from "react";
import { FiWifiOff, FiRefreshCw } from "react-icons/fi";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const onOffline = () => { setIsOffline(true); setWasOffline(true); };
    const onOnline = () => setIsOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!isOffline) {
    if (!wasOffline) return null;
    // briefly show reconnected
    return (
      <div className="fixed top-0 inset-x-0 z-[60] flex justify-center pointer-events-none px-3 pt-[env(safe-area-inset-top)]">
        <div className="pointer-events-auto bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-b-xl shadow-lg">
          Back online — reconnected ✓
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <FiWifiOff className="w-8 h-8 text-amber-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">You’re offline</h2>
      <p className="text-sm text-gray-600 mt-2 max-w-sm">
        No internet connection — Trend Tribe needs internet to load listings, chats and images. Check your data or Wi-Fi and try again.
      </p>
      <p className="text-xs text-gray-400 mt-1">The app isn’t broken — it will reconnect automatically.</p>
      <button onClick={() => window.location.reload()} className="mt-6 btn-primary flex items-center gap-2">
        <FiRefreshCw className="w-4 h-4" /> Retry
      </button>
      <p className="text-xs text-gray-400 mt-6">Offline mode: browsing cached pages works, new data needs internet.</p>
    </div>
  );
}
