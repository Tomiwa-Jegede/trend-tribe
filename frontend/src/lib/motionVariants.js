// src/lib/motionVariants.js — Shared Framer Motion presets
//
// Centralizing variants here means every component animates with the
// SAME timing and easing — this is what makes motion feel "designed"
// instead of randomly inconsistent across pages.

// ─── Timing tokens ──────────────────────────────────────────
export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
};

export const EASE = [0.4, 0, 0.2, 1]; // standard "ease-out" curve

// ─── Page transition (used by PageTransition.jsx) ─────────────
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition = {
  duration: DURATION.base,
  ease: EASE,
};

// ─── Reduced-motion-safe variants ──────────────────────────────
// When reduced motion is on, we fall back to opacity-only — no
// translation, no scale. This keeps feedback (something changed)
// without movement (which can trigger vestibular discomfort).
export const pageVariantsReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Stagger container (grid entrances) ────────────────────────
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

// ─── Card entrance (used inside a staggerContainer) ────────────
export const cardEntrance = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export const cardEntranceReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

// ─── Hover lift (cards, buttons) ───────────────────────────────
export const hoverLift = {
  rest: { y: 0, scale: 1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  hover: { y: -4, scale: 1.01, boxShadow: "0 12px 24px rgba(0,0,0,0.08)" },
};

// ─── Tap feedback (buttons, mobile cards) ──────────────────────
export const tapScale = {
  scale: 0.97,
};

// ─── Fade + slide (alerts, banners) ─────────────────────────────
export const slideFade = {
  initial: { opacity: 0, y: -8, height: 0 },
  animate: { opacity: 1, y: 0, height: "auto" },
  exit: { opacity: 0, y: -8, height: 0 },
};
