import Link from "next/link";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Suspense } from "react";
import SearchBar from "./SearchBar";
import RefreshButton from "./RefreshButton";
import CommandPaletteHost from "./CommandPaletteHost";
import { getSubjects } from "@/lib/github";
import { buildSearchIndex } from "@/lib/searchIndex";
import styles from "./Header.module.css";

export default async function Header() {
  // getSubjects is request-deduped and cached, so this costs nothing extra
  // beyond what the page already fetched.
  const index = buildSearchIndex(await getSubjects());

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="jasonpieterkwork — home">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG: next/image cannot optimise it and would only add a request */}
          <img src="/mark.svg" alt="" width={32} height={32} className={styles.mark} />
          <span className={styles.brandText}>jasonpieterkwork</span>
        </Link>
        <div className={styles.searchWrap}>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
        <Link href="/changelog" className={styles.navBtn} title="What changed recently">
          <ClockCounterClockwise size={18} weight="bold" />
          <span className={styles.navBtnText}>Changelog</span>
        </Link>
        <RefreshButton />
        <CommandPaletteHost index={index} />
      </div>
    </header>
  );
}
