"use client";

import { useEffect, useState } from "react";

/**
 * prefers-reduced-motion, without breaking hydration.
 *
 * Framer Motion's own useReducedMotion reads the media query during the first
 * client render, so a reduced-motion visitor gets different markup than the
 * server produced and React discards the tree. This hook always reports false
 * for the server render and the first client render, then reports the real
 * value from an effect — so the two renders always agree.
 */
export function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}
