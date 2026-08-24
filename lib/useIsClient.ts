"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * True once hydrated, false during SSR — for portals and anything else that
 * needs `document`.
 *
 * ponytail: useSyncExternalStore rather than the usual
 * `useState(false)` + `useEffect(() => setMounted(true))`, which costs an extra
 * render pass and trips react-hooks/set-state-in-effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
