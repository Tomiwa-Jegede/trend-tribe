// src/components/pwa/InstallPrompt.jsx — Add to Home Screen banner + push opt-in
import { useEffect, useState } from "react";
import { isPushSupported, getPermission, subscribePush } from "../../services/push";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("tt_pwa_dismissed") === "1");
  const [pushState, setPushState] = useState(getPermission());

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
    // detect already standalone
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    // keep pushState fresh when permission changes via browser UI
    const id = setInterval(() => setPushState(getPermission()), 3000);
    return () => clearInterval(id);
  }, []);

  if (installed || dismissed) return null;

  const showInstall = !!deferred;
  const showPush = isPushSupported() && pushState !== "granted" && pushState !== "unsupported";
  if (!showInstall && !showPush) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDeferred(null);
  };

  const handleEnablePush = async () => {
    try {
      await subscribePush();
      setPushState("granted");
    } catch (e) {
      alert(e.message || "Could not enable notifications");
      setPushState(getPermission());
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("tt_pwa_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-sm z-50">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F1F3D] flex items-center justify-center shrink-0">
            <img src="/icon-192.png" alt="" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Install Trend Tribe</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Add to Home Screen for full-screen app + notifications even when closed.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {showInstall && (
                <button onClick={handleInstall} className="text-xs font-bold px-4 py-2 rounded-full bg-[#F5C518] text-[#0F1F3D] hover:brightness-95">
                  Install app
                </button>
              )}
              {showPush && (
                <button onClick={handleEnablePush} className="text-xs font-bold px-4 py-2 rounded-full bg-[#1340B8] text-white hover:bg-[#0F2F8A]">
                  Enable notifications
                </button>
              )}
              <button onClick={handleDismiss} className="text-xs font-semibold px-3 py-2 rounded-full border border-gray-200 hover:bg-gray-50">
                Not now
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              iPhone: Share → Add to Home Screen. Push works after installing (iOS 16.4+).
            </p>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      </div>
    </div>
  );
}
