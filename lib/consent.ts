const CONSENT_KEY = "smp:consent";

export type ConsentState = "accepted" | "declined" | null;

export function getConsent(): ConsentState {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(state: "accepted" | "declined"): void {
  try {
    localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // storage blocked — banner will just show again next visit
  }
}

/** Analytics only ever fires once someone has explicitly said yes. */
export function hasConsent(): boolean {
  return getConsent() === "accepted";
}
