/**
 * `node --experimental-strip-types lib/device.selfcheck.mts`
 *
 * Real user-agent strings. The negative cases matter as much as the positive
 * ones: iPad and Mac must never trigger the iPhone-only warning.
 */
import assert from "node:assert";
import { isIphoneUA } from "./device.ts";

const IPHONE: [string, string][] = [
  // Safari, iOS 17
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "iPhone",
  ],
  // Chrome on iOS
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
    "iPhone",
  ],
  // Firefox on iOS
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
    "iPhone",
  ],
  // Edge on iOS
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 EdgiOS/125.0 Mobile/15E148 Safari/604.1",
    "iPhone",
  ],
  // Older iPhone
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1",
    "iPhone",
  ],
  // In-app browser (Instagram) on an iPhone
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 Instagram 331.0.0.28.105",
    "iPhone",
  ],
  // Platform set but UA overridden to something generic
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "iPhone"],
];

const NOT_IPHONE: [string, string][] = [
  // iPad, iPadOS 17 — reports as Macintosh
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "MacIntel",
  ],
  // iPad in its legacy mode
  [
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "iPad",
  ],
  // Mac desktop
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "MacIntel",
  ],
  // Android phone
  [
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    "Linux armv8l",
  ],
  // Windows desktop
  [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Win32",
  ],
  // Windows Phone, which used to put "iPhone" in its UA
  [
    "Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 920) like iPhone OS 7_0_3 Mac OS X Safari/537",
    "",
  ],
  // Empty / unknown
  ["", ""],
];

for (const [ua, platform] of IPHONE) {
  assert.equal(isIphoneUA(ua, platform), true, `should detect iPhone: ${ua.slice(0, 60)}`);
}
for (const [ua, platform] of NOT_IPHONE) {
  assert.equal(isIphoneUA(ua, platform), false, `should NOT detect iPhone: ${ua.slice(0, 60)}`);
}

console.log(`device selfcheck ok — ${IPHONE.length} iPhone UAs, ${NOT_IPHONE.length} non-iPhone UAs`);
