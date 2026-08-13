import Link from "next/link";
import { Suspense } from "react";
import SearchBar from "./SearchBar";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <img src="/mark.svg" alt="" className={styles.mark} />
          <span>jasonpieterkwork</span>
        </Link>
        <div className={styles.searchWrap}>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
