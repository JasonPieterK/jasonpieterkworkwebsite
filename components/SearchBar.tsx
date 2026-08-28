"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDeviceInfo, getSessionId } from "@/lib/deviceInfo";
import { hasConsent } from "@/lib/consent";
import styles from "./SearchBar.module.css";

function trackSearch(query: string) {
  if (!hasConsent()) return;
  fetch("/api/track-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, ...getDeviceInfo(), sessionId: getSessionId() }),
    keepalive: true,
  }).catch(() => {});
}

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in step with ?q= (back/forward, or a link into /search)
  // without an effect round-trip.
  const urlQuery = searchParams.get("q") ?? "";
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setValue(urlQuery);
  }

  // A pending timer would otherwise fire after the user has clicked through to
  // another page and yank them to /search.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const q = next.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
        trackSearch(q);
      } else if (window.location.pathname === "/search") {
        // Clearing the box should clear the results, not leave stale ones up.
        router.push("/search");
      }
    }, 300);
  }

  return (
    <div className={styles.wrap}>
      <input
        className={`mmm-input ${styles.input}`}
        type="search"
        placeholder="Search files or subjects…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <kbd className={styles.hint} aria-hidden="true">
        /
      </kbd>
    </div>
  );
}
