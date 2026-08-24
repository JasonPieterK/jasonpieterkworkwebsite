"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => "";

/**
 * The decoded URL hash (without "#"), or "" on the server.
 *
 * Deep links use a hash rather than a query param on purpose: `useSearchParams`
 * opts a page out of static prerendering unless it sits inside a Suspense
 * boundary, and the hash is never part of the server-rendered output anyway.
 */
export function useHash(): string {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!hash) return "";
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}
