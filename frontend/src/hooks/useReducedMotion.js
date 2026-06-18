// src/hooks/useReducedMotion.js — Accessibility-first motion hook

import { useState, useEffect } from "react";

// Returns true if the user has "Reduce Motion" enabled at the OS/browser level.
// Every animated component should check this before applying movement.
export const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e) => setPrefersReduced(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
};

export default useReducedMotion;
