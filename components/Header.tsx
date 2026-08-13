import Link from "next/link";
import { Suspense } from "react";
import SearchBar from "./SearchBar";
import RefreshButton from "./RefreshButton";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="jasonpieterkwork — home">
          <img src="/mark.svg" alt="" className={styles.mark} />
          <span className={styles.brandText}>jasonpieterkwork</span>
        </Link>
        <div className={styles.searchWrap}>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
        <RefreshButton />
      </div>
    </header>
  );
}
