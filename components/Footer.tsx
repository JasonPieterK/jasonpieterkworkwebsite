import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>
        Made by Jason Pieter Kusumajaya ·{" "}
        <Link href="/license" className={`${styles.mono} ${styles.licenseLink}`}>
          MIT License
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className={`${styles.mono} ${styles.licenseLink}`}>
          Privacy Policy
        </Link>
      </p>
    </footer>
  );
}
