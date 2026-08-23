"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Keeps a component mounted while it plays its closing animation.
 *
 *   const { mounted, closing } = useExitAnimation(open, 220);
 *   if (!mounted) return null;
 *   <div className={closing ? styles.overlayClosing : styles.overlay} />
 *
 * ponytail: a timer and two booleans. No animation library, and no
 * `onAnimationEnd` plumbing that breaks when a child animation fires first.
 */
export function useExitAnimation(open: boolean, durationMs = 220) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }

    if (!mounted) return;

    // Reduced motion: skip the exit entirely rather than freezing on screen.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMounted(false);
      setClosing(false);
      return;
    }

    setClosing(true);
    timer.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, durationMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, mounted, durationMs]);

  return { mounted, closing };
}
