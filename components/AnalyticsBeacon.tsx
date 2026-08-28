"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getDeviceInfo, getReferrer, getSessionId } from "@/lib/deviceInfo";
import { hasConsent } from "@/lib/consent";

/**
 * Fires a fire-and-forget pageview beacon on every route change, and reports
 * how long the previous page was open when the visitor navigates away.
 * Renders nothing — it exists purely for the side effect, so it can live
 * once in the root layout without affecting any page's markup.
 */
export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const current = useRef<{ id: string; startedAt: number } | null>(null);

  function reportDuration() {
    const c = current.current;
    if (!c) return;
    const durationSeconds = (Date.now() - c.startedAt) / 1000;
    const body = JSON.stringify({ id: c.id, durationSeconds });
    // sendBeacon survives the page actually unloading; a normal fetch can get
    // cancelled mid-flight the instant navigation commits.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-duration", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track-duration", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
        () => {}
      );
    }
    current.current = null;
  }

  useEffect(() => {
    // /admin is the operator's own traffic, not a student visit — skip it so
    // it doesn't pollute the device/browser breakdown it exists to show.
    if (pathname.startsWith("/admin") || !hasConsent()) return;

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        ...getDeviceInfo(),
        sessionId: getSessionId(),
        referrer: getReferrer(),
      }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) current.current = { id: data.id, startedAt: Date.now() };
      })
      .catch(() => {});
  }, [pathname]);

  // Report the *previous* page's duration right before switching to a new one.
  useEffect(() => {
    return () => reportDuration();
  }, [pathname]);

  useEffect(() => {
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    function onHide() {
      if (document.visibilityState === "hidden") reportDuration();
    }
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return null;
}
