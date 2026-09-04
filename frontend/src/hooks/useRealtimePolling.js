// src/hooks/useRealtimePolling.js — lightweight real-time via polling + focus revalidation
import { useEffect, useRef } from "react";

export const useRealtimePolling = (callback, intervalMs = 10000, enabled = true) => {
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    // initial call is caller's responsibility; we just poll
    const id = setInterval(() => cbRef.current?.(), intervalMs);

    const onFocus = () => cbRef.current?.();
    const onVisibility = () => {
      if (document.visibilityState === "visible") cbRef.current?.();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
};

export default useRealtimePolling;
