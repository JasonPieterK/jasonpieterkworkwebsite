import Link from "next/link";
import { Suspense } from "react";
import SearchBar from "./SearchBar";
import RefreshButton from "./RefreshButton";
import CommandPalette from "./CommandPalette";
import { getSubjects } from "@/lib/github";
import styles from "./Header.module.css";

export default async function Header() {
  // getSubjects is request-deduped and cached, so this costs nothing extra
  // beyond what the page already fetched.
  const subjects = await getSubjects();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="jasonpieterkwork — home">
          <img src="/mark.svg" alt="" width={32} height={32} className={styles.mark} />
          <span className={styles.brandText}>jasonpieterkwork</span>
        </Link>
        <div className={styles.searchWrap}>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
        <RefreshButton />
        <CommandPalette subjects={subjects} />
      </div>
    </header>
  );
}
