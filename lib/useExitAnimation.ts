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
 *
 * The open->closing transition is computed during render (React's "adjusting
 * state when a prop changes" pattern) so no effect ever calls setState
 * synchronously; the effect below only schedules the unmount.
 */
export function useExitAnimation(open: boolean, durationMs = 220) {
  const [state, setState] = useState<{ mounted: boolean; closing: boolean }>({
    mounted: open,
    closing: false,
  });
  const [prevOpen, setPrevOpen] = useState(open);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setState({ mounted: true, closing: false });
    } else if (state.mounted) {
      setState({ mounted: true, closing: true });
    }
  }

  useEffect(() => {
    if (!state.closing) return;

    // Reduced motion: unmount on the next tick rather than holding a frozen
    // panel on screen for the animation's duration.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(
      () => setState({ mounted: false, closing: false }),
      reduced ? 0 : durationMs
    );

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state.closing, durationMs]);

  return { mounted: state.mounted, closing: state.closing };
}
