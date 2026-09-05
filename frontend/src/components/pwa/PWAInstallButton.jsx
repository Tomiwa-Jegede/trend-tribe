// src/components/pwa/PWAInstallButton.jsx — one-tap install button for website
import { useState } from "react";
import { FiDownload, FiSmartphone, FiShare2, FiPlus } from "react-icons/fi";
import usePWAInstall from "../../hooks/usePWAInstall";

export default function PWAInstallButton({ variant = "primary", className = "", size = "default" }) {
  const { canInstall, isIOSInstallable, installed, promptInstall } = usePWAInstall();
  const [showIOS, setShowIOS] = useState(false);

  if (installed) return null;

  // variant styles
  const base = "inline-flex items-center gap-2 font-bold rounded-full transition-colors";
  const sizes = {
    default: "text-sm px-4 py-2",
    small: "text-xs px-3 py-1.5",
    large: "text-base px-6 py-3",
  };
  const variants = {
    primary: "bg-[#0F1F3D] text-white hover:bg-[#1a2d5a] border border-transparent",
    accent: "bg-[#F5C518] text-[#0F1F3D] hover:brightness-95",
    outline: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    ghost: "bg-transparent text-primary-600 hover:bg-primary-50",
  };

  const cls = `${base} ${sizes[size] || sizes.default} ${variants[variant] || variants.primary} ${className}`;

  if (canInstall) {
    return (
      <>
        <button onClick={promptInstall} className={cls} aria-label="Install Trend Tribe app">
          <FiDownload className="w-4 h-4" /> Install app
        </button>
      </>
    );
  }

  if (isIOSInstallable) {
    return (
      <>
        <button onClick={() => setShowIOS(true)} className={cls} aria-label="Install Trend Tribe app">
          <FiSmartphone className="w-4 h-4" /> Install app
        </button>
        {showIOS && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowIOS(false)}>
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900">Install on iPhone</h3>
              <ol className="text-sm text-gray-600 mt-3 space-y-2 list-decimal list-inside">
                <li className="flex items-start gap-2"><FiShare2 className="w-4 h-4 mt-0.5 shrink-0" /> Tap <b>Share</b> (square with arrow) at the bottom</li>
                <li className="flex items-start gap-2"><FiPlus className="w-4 h-4 mt-0.5 shrink-0" /> Tap <b>Add to Home Screen</b></li>
                <li>Tap <b>Add</b> → open from home screen for full-screen app</li>
              </ol>
              <p className="text-xs text-gray-400 mt-3">Requires iOS 16.4+ for push notifications. Open the installed app once, then allow notifications.</p>
              <button onClick={() => setShowIOS(false)} className="mt-4 w-full btn-primary text-sm">Got it</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback: not iOS and prompt not yet available — show helper that explains manual install
  // This ensures iPhone always sees a button even if UA detection weird, and Android sees help pre-prompt
  return (
    <>
      <button onClick={() => setShowIOS(true)} className={cls} aria-label="Install Trend Tribe app">
        <FiDownload className="w-4 h-4" /> Install app
      </button>
      {showIOS && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowIOS(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Install Trend Tribe</h3>
            <div className="text-sm text-gray-600 mt-3 space-y-3">
              <p><b>iPhone (Safari):</b> Tap <FiShare2 className="inline w-4 h-4" /> Share (bottom) → <b>Add to Home Screen</b> → Add</p>
              <p><b>Android (Chrome):</b> Tap <b>⋮</b> top-right → <b>Install app</b> / <b>Add to Home Screen</b></p>
              <p><b>Desktop:</b> Address bar → Install icon ⊕</p>
            </div>
            <button onClick={() => setShowIOS(false)} className="mt-4 w-full btn-primary text-sm">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
