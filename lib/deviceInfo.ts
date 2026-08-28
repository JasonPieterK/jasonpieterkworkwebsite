export type DeviceInfo = {
  device: string;
  browser: string;
  os: string;
  deviceModel: string;
  screen: string;
  language: string;
  userAgent: string;
};

/**
 * Coarse client classification for the analytics dashboard — not meant to be
 * exact, just enough to answer "phone or laptop", "Chrome or Safari", and
 * "which model" without pulling in a UA-parsing library for a handful of
 * regexes. The raw user agent is captured alongside so nothing is lost.
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === "undefined") {
    return { device: "unknown", browser: "unknown", os: "unknown", deviceModel: "unknown", screen: "", language: "", userAgent: "" };
  }
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

  // Best-effort model string: iPhone/iPad report no model in UA (Apple hides
  // it), Android devices usually do ("SM-G991B", "Pixel 7").
  let deviceModel = os;
  if (/iPhone/i.test(ua)) deviceModel = "iPhone";
  else if (/iPad/i.test(ua)) deviceModel = "iPad";
  else {
    const androidModel = /Android[^;]*;\s*([^)]+?)(?:\s+Build|\))/i.exec(ua);
    if (androidModel?.[1]) deviceModel = androidModel[1].trim();
  }

  const screen =
    typeof window !== "undefined" && window.screen ? `${window.screen.width}x${window.screen.height}` : "";

  return {
    device,
    browser,
    os,
    deviceModel,
    screen,
    language: navigator.language ?? "",
    userAgent: ua,
  };
}

const SESSION_KEY = "smp:session-id";

/**
 * One random id per browser, persisted in localStorage — lets the analytics
 * dashboard group a visitor's visits and downloads into a session without
 * fingerprinting anything. Regenerates only if storage is cleared.
 */
export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

export function getReferrer(): string {
  try {
    return document.referrer || "";
  } catch {
    return "";
  }
}
