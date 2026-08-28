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

/**
 * No banner is shown anymore, so there's no way for a visitor to actively
 * decline — analytics just runs, same as before consent tracking existed.
 * getConsent()/setConsent() are kept in case the banner comes back later.
 */
export function hasConsent(): boolean {
  return getConsent() !== "declined";
}
