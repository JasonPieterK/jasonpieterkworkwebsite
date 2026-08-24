/**
 * iPhone detection.
 *
 * Deliberately iPhone-only. iOS is the platform where a .docx opens in a
 * read-only Quick Look preview that mangles layout, or bounces the student
 * into an App Store prompt for Word — a PDF just opens. iPadOS handles
 * documents far better and, since iPadOS 13, reports itself as a Mac anyway.
 *
 * Kept as a pure function of the two navigator values so it can be checked
 * against real user-agent strings without a browser:
 *   node --experimental-strip-types lib/device.selfcheck.mts
 */
export function isIphoneUA(userAgent: string, platform = ""): boolean {
  if (!userAgent) return false;

  // Windows Phone used to embed "iPhone" in its UA to get mobile pages.
  if (/Windows Phone|IEMobile/i.test(userAgent)) return false;

  // Every browser on an iPhone — Safari, Chrome (CriOS), Firefox (FxiOS),
  // Edge (EdgiOS) — keeps "iPhone" in the UA, because they all run WebKit.
  if (/\biPhone\b|\biPod\b/.test(userAgent)) return true;

  // Safari on iOS also exposes this, and it survives some UA overrides.
  return platform === "iPhone" || platform === "iPod";
}

/** Reads the current browser's values. Returns false during SSR. */
export function detectIphone(): boolean {
  if (typeof navigator === "undefined") return false;
  return isIphoneUA(navigator.userAgent, navigator.platform ?? "");
}
