export type DeviceInfo = { device: string; browser: string; os: string };

/**
 * Coarse client classification for the analytics dashboard — not meant to be
 * exact, just enough to answer "phone or laptop" and "Chrome or Safari"
 * without pulling in a UA-parsing library for a handful of regexes.
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === "undefined") return { device: "unknown", browser: "unknown", os: "unknown" };
  const ua = navigator.userAgent;

  let device = "desktop";
  if (/iPad|Tablet(?!.*Mobile)/i.test(ua)) device = "tablet";
  else if (/Mobi|Android(?!.*Tablet)|iPhone/i.test(ua)) device = "mobile";

  let os = "other";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  return { device, browser, os };
}
