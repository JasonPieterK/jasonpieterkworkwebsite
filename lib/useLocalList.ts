"use client";

import { useCallback, useSyncExternalStore } from "react";

export const STARRED_KEY = "smp:starred";

const EMPTY: string[] = [];
// getSnapshot must return a stable reference or React re-renders forever, so
// each key's parsed array is cached until something writes to that key.
const cache = new Map<string, { raw: string | null; value: string[] }>();

function readList(key: string): string[] {
  const raw = localStorage.getItem(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed.filter((v) => typeof v === "string");
  } catch {
    value = EMPTY;
  }
  cache.set(key, { raw, value });
  return value;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener("local-list", onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("local-list", onChange);
  };
}

/**
 * A list of file paths in localStorage, shared by every component on the page
 * and across tabs. useSyncExternalStore keeps the server snapshot empty, so
 * hydration matches and the stored value appears right after.
 * ponytail: no store library — one event name and a string array.
 */
export function useLocalList(key: string, limit = 50) {
  const items = useSyncExternalStore(
    subscribe,
    () => readList(key),
    () => EMPTY // server render: nothing persisted yet
  );

  const write = useCallback(
    (next: string[]) => {
      const capped = next.slice(0, limit);
      try {
        localStorage.setItem(key, JSON.stringify(capped));
      } catch {
        // private mode / quota — the UI just won't persist
      }
      window.dispatchEvent(new Event("local-list"));
    },
    [key, limit]
  );

  const toggle = useCallback(
    (path: string) => {
      const current = readList(key);
      write(current.includes(path) ? current.filter((p) => p !== path) : [path, ...current]);
    },
    [key, write]
  );

  const clear = useCallback(() => write([]), [write]);

  return { items, toggle, clear, has: (path: string) => items.includes(path) };
}
