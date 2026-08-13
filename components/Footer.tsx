import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>
        Made by Jason Pieter Kusumajaya · <span className={styles.mono}>MIT License</span>
      </p>
    </footer>
  );
}
