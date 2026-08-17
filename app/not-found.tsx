import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={`container ${styles.wrap}`}>
      <img src="/illustrations/illu-confetti.svg" alt="" width={96} height={96} className={styles.illu} />
      <h1 className="hero">OOPS.</h1>
      <p className={styles.text}>That page wandered off. Let&rsquo;s get you back.</p>
      <Link href="/" className="mmm-btn">
        Back home
      </Link>
    </main>
  );
}
