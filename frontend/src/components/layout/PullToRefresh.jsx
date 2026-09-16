// src/components/layout/PullToRefresh.jsx
import { useRef, useState, useEffect, useCallback } from "react";

const MAX_PULL = 110;
const TRIGGER = 70;
const RESISTANCE = 0.5;

export default function PullToRefresh({ children, disabled = false }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const isAtTop = useCallback(() => window.scrollY === 0 || document.documentElement.scrollTop === 0, []);

  const onTouchStart = useCallback((e) => {
    if (disabled || refreshing) return;
    if (!isAtTop()) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [disabled, refreshing, isAtTop]);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || disabled || refreshing) return;
    const curY = e.touches[0].clientY;
    const diff = curY - startY.current;
    if (diff <= 0) {
      if (pull !== 0) setPull(0);
      return;
    }
    if (!isAtTop() && diff > 0) {
      pulling.current = false;
      setPull(0);
      return;
    }
    // prevent native pull-to-refresh while we handle it
    if (diff > 8) e.preventDefault();
    const resisted = Math.min(MAX_PULL, diff * RESISTANCE);
    setPull(resisted);
  }, [disabled, refreshing, isAtTop, pull]);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull > TRIGGER && !refreshing) {
      setRefreshing(true);
      setPull(56);
      setTimeout(() => window.location.reload(), 300);
    } else {
      setPull(0);
    }
  }, [pull, refreshing]);

  useEffect(() => {
    const el = document;
    // use passive:false so we can preventDefault on touchMove
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const progress = Math.min(1, pull / TRIGGER);
  const spinnerSize = 28 + progress * 10;
  const opacity = pull > 2 || refreshing ? Math.min(1, 0.3 + progress * 0.9) : 0;
  const translateY = pull;

  return (
    <>
      {/* spinner - fixed outside transformed content so it stays at viewport top */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${pull > 0 || refreshing ? 10 : -48}px)`,
          opacity,
          transition: pulling.current ? "none" : "transform 0.22s ease-out, opacity 0.2s ease-out",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: spinnerSize,
            height: spinnerSize,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 3,
            transform: `scale(${0.85 + progress * 0.15})`,
            transition: pulling.current ? "none" : "transform 0.22s ease-out, width 0.18s, height 0.18s",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "3px solid #e5e7eb",
              borderTopColor: "#1340B8",
              borderRightColor: "#F5C518",
              transform: refreshing ? undefined : `rotate(${pull * 3}deg)`,
              animation: refreshing ? "pull-spin 0.7s linear infinite" : undefined,
            }}
          />
        </div>
      </div>
      <style>{`@keyframes pull-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ transform: `translateY(${translateY}px)`, transition: pulling.current ? "none" : "transform 0.22s ease-out" }}>
        {children}
      </div>
    </>
  );
}
