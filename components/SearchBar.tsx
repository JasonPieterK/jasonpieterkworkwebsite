"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./SearchBar.module.css";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next.trim()) {
        router.push(`/search?q=${encodeURIComponent(next.trim())}`);
      }
    }, 300);
  }

  return (
    <div className={styles.wrap}>
      <input
        className={`mmm-input ${styles.input}`}
        type="search"
        placeholder="Search files or subjects…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <kbd className={styles.hint} aria-hidden="true">
        /
      </kbd>
    </div>
  );
}
