"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/consent";
import styles from "./CookieConsent.module.css";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a stored choice on mount
    if (getConsent() === null) setVisible(true);
  }, []);

  function choose(state: "accepted" | "declined") {
    setConsent(state);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className={styles.bar} role="dialog" aria-label="Cookie and analytics consent">
      <p className={styles.text}>
        This site uses local storage to remember starred files and admin sessions, and — only if you say
        yes — logs anonymous usage data (device, browser, approximate location, and which files get
        downloaded) so the site owner can see how the materials are used.{" "}
        <Link href="/privacy" className={styles.link}>
          Read the privacy policy
        </Link>
        .
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.declineBtn} onClick={() => choose("declined")}>
          Decline
        </button>
        <button type="button" className={`mmm-btn mmm-btn--mode ${styles.acceptBtn}`} onClick={() => choose("accepted")}>
          Accept
        </button>
      </div>
    </div>
  );
}
