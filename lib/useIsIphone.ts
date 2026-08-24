"use client";

import { detectIphone } from "./device";
import { useIsClient } from "./useIsClient";

/**
 * True on iPhone, false everywhere else and during SSR.
 *
 * Evaluated during render rather than cached in a store: the value is derived
 * from navigator, which costs nothing to read, and a cached snapshot with a
 * no-op subscription can never be re-read — which also makes it impossible to
 * exercise from a test.
 */
export function useIsIphone(): boolean {
  // Gated on hydration so the server (which has no navigator) and the first
  // client render agree.
  return useIsClient() && detectIphone();
}
