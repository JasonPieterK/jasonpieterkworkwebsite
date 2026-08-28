export type DeviceInfo = {
  device: string;
  browser: string;
  os: string;
  deviceModel: string;
  screen: string;
  language: string;
  userAgent: string;
};

// Safari's user agent never names the model — Apple strips it for privacy.
// But every model has a fixed CSS-pixel screen size and device pixel ratio,
// so a "width x height @ dpr" fingerprint identifies it about as precisely
// as anything short of a native app. Where two+ models share an identical
// panel, all of them are listed rather than guessing one.
const APPLE_MODELS: Record<string, string> = {
  "320x480@2": "iPhone 4/4s",
  "320x568@2": "iPhone 5/5s/5c/SE (1st gen)",
  "375x667@2": "iPhone 6/6s/7/8/SE (2nd/3rd gen)",
  "414x736@3": "iPhone 6+/6s+/7+/8+",
  "375x812@3": "iPhone X/XS/11 Pro/12 mini/13 mini",
  "414x896@2": "iPhone XR/11",
  "414x896@3": "iPhone XS Max/11 Pro Max",
  "390x844@3": "iPhone 12/12 Pro/13/13 Pro/14",
  "428x926@3": "iPhone 12 Pro Max/13 Pro Max/14 Plus",
  "393x852@3": "iPhone 14 Pro/15/15 Pro/16",
  "430x932@3": "iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus",
  "402x874@3": "iPhone 16 Pro",
  "440x956@3": "iPhone 16 Pro Max",
  "768x1024@2": "iPad (9.7\")/iPad mini 4+/iPad Air 1-2",
  "810x1080@2": "iPad (10.2\")",
  "820x1180@2": "iPad Air (4th/5th gen)",
  "834x1194@2": "iPad Pro 11\"",
  "1024x1366@2": "iPad Pro 12.9\"",
  "744x1133@2": "iPad mini (6th gen)",
};

function inferAppleModel(fallback: "iPhone" | "iPad"): string {
  if (typeof window === "undefined" || !window.screen) return fallback;
  const w = Math.min(window.screen.width, window.screen.height);
  const h = Math.max(window.screen.width, window.screen.height);
  const dpr = Math.round((window.devicePixelRatio || 1) * 10) / 10;
  return APPLE_MODELS[`${w}x${h}@${dpr}`] ?? `${fallback} (${w}x${h}@${dpr}x, unrecognized)`;
}

// Android reports its model directly in the UA — Pixel, Xiaomi/Redmi/POCO,
// and OnePlus already send a human name ("Pixel 8", "Redmi Note 12"), no
// translation needed. Samsung is the one major exception: it sends an
// internal code ("SM-S918B") instead of "Galaxy S23 Ultra". Matched by
// prefix since the trailing letter varies by region (B/U/N/W/F...).
const SAMSUNG_PREFIXES: [prefix: string, name: string][] = [
  ["SM-S928", "Galaxy S24 Ultra"],
  ["SM-S926", "Galaxy S24+"],
  ["SM-S921", "Galaxy S24"],
  ["SM-S918", "Galaxy S23 Ultra"],
  ["SM-S916", "Galaxy S23+"],
  ["SM-S911", "Galaxy S23"],
  ["SM-S901", "Galaxy S23 FE"],
  ["SM-G998", "Galaxy S21 Ultra"],
  ["SM-G996", "Galaxy S21+"],
  ["SM-G991", "Galaxy S21"],
  ["SM-G781", "Galaxy S20 FE"],
  ["SM-G780", "Galaxy S20 FE"],
  ["SM-G988", "Galaxy S20 Ultra"],
  ["SM-G986", "Galaxy S20+"],
  ["SM-G981", "Galaxy S20"],
  ["SM-N986", "Galaxy Note 20 Ultra"],
  ["SM-N981", "Galaxy Note 20"],
  ["SM-F946", "Galaxy Z Fold 5"],
  ["SM-F936", "Galaxy Z Fold 4"],
  ["SM-F926", "Galaxy Z Fold 3"],
  ["SM-F731", "Galaxy Z Flip 5"],
  ["SM-F721", "Galaxy Z Flip 4"],
  ["SM-A566", "Galaxy A56"],
  ["SM-A556", "Galaxy A55"],
  ["SM-A546", "Galaxy A54"],
  ["SM-A536", "Galaxy A53"],
  ["SM-A346", "Galaxy A34"],
  ["SM-A336", "Galaxy A33"],
  ["SM-A256", "Galaxy A25"],
  ["SM-A245", "Galaxy A24"],
  ["SM-A235", "Galaxy A23"],
  ["SM-A155", "Galaxy A15"],
  ["SM-A145", "Galaxy A14"],
  ["SM-A135", "Galaxy A13"],
  ["SM-A125", "Galaxy A12"],
  ["SM-A047", "Galaxy A04s"],
  ["SM-A045", "Galaxy A04"],
  ["SM-M356", "Galaxy M35"],
  ["SM-M346", "Galaxy M34"],
  ["SM-M336", "Galaxy M33"],
];

function inferAndroidModel(raw: string): string {
  const match = SAMSUNG_PREFIXES.find(([prefix]) => raw.toUpperCase().startsWith(prefix));
  return match ? match[1] : raw;
}

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
  // it deliberately), Android devices usually do ("SM-G991B", "Pixel 7").
  let deviceModel = os;
  if (/iPhone/i.test(ua)) deviceModel = inferAppleModel("iPhone");
  else if (/iPad/i.test(ua)) deviceModel = inferAppleModel("iPad");
  else {
    const androidModel = /Android[^;]*;\s*([^)]+?)(?:\s+Build|\))/i.exec(ua);
    const raw = androidModel?.[1]?.trim();
    // Chrome's "User-Agent Reduction" replaces the real model with a single
    // placeholder letter ("K") on some Android versions — a real model name
    // is always longer than that, so anything this short isn't one.
    if (raw && raw.length > 2) deviceModel = inferAndroidModel(raw);
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
