"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getDeviceInfo } from "@/lib/deviceInfo";

/**
 * Fires a fire-and-forget pageview beacon on every route change. Renders
 * nothing — it exists purely for the side effect, so it can live once in the
 * root layout without affecting any page's markup.
 */
export default function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    // /admin is the operator's own traffic, not a student visit — skip it so
    // it doesn't pollute the device/browser breakdown it exists to show.
    if (pathname.startsWith("/admin")) return;
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, ...getDeviceInfo() }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
