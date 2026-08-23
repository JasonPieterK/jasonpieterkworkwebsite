"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./TopProgress.module.css";

/**
 * Global loading bar. Starts on internal link clicks and on any
 * `progress:start` window event, finishes on route change or on
 * `progress:done`. Anything slow (refresh, revalidate, fetch) can
 * drive it without importing this file:
 *
 *   window.dispatchEvent(new Event("progress:start"))
 *   window.dispatchEvent(new Event("progress:done"))
 */
export default function TopProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function stopTicking() {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    }

    function start() {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setActive(true);
      setProgress(8);
      stopTicking();
      // Ease toward 90% — the last 10% only lands when the work is done.
      timer.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.12));
      }, 180);
    }

    function done() {
      stopTicking();
      setProgress(100);
      hideTimer.current = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 350);
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (href === pathname + window.location.search) return;
      start();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("progress:start", start);
    window.addEventListener("progress:done", done);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("progress:start", start);
      window.removeEventListener("progress:done", done);
      stopTicking();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  // Route landed — finish whatever was running.
  useEffect(() => {
    window.dispatchEvent(new Event("progress:done"));
  }, [pathname, searchParams]);

  if (!active) return null;

  return (
    <div className={styles.track} role="progressbar" aria-label="Loading" aria-valuenow={Math.round(progress)}>
      <div className={styles.bar} style={{ width: `${progress}%` }} />
    </div>
  );
}
