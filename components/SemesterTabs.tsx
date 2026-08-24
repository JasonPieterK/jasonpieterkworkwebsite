"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useHash } from "@/lib/useHash";
import type { SemesterGroup } from "@/lib/types";
import { SORTS, sortFiles, type SortKey } from "@/lib/sort";
import FileCard from "./FileCard";
import ZipButton from "./ZipButton";
import styles from "./SemesterTabs.module.css";

type StatusFilter = "all" | "new" | "updated";

export default function SemesterTabs({
  subjectSlug,
  semesters,
}: {
  subjectSlug: string;
  semesters: SemesterGroup[];
}) {
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  // Typing stays responsive; the (animated) grid catches up a beat later
  // instead of remounting on every keystroke.
  const deferredQuery = useDeferredValue(query);
  const focusPath = useHash();

  // Deep link from the command palette (#<path>): jump to the semester
  // that holds it and filter down to that one file. Applied during render so
  // the first paint already shows the right tab.
  const [prevFocus, setPrevFocus] = useState(focusPath);
  if (focusPath !== prevFocus) {
    setPrevFocus(focusPath);
    if (focusPath) {
      const i = semesters.findIndex((g) => g.files.some((f) => f.path === focusPath));
      if (i !== -1) {
        setActive(i);
        setStatus("all");
        setQuery(focusPath.split("/").pop() ?? "");
        // Clear it so choosing the same file again still fires a hashchange.
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    }
  }

  function resetFilters() {
    setStatus("all");
    setQuery("");
  }

  // `active` can point past the end for a moment after a semester list change.
  const current = semesters[active] ?? semesters[0];

  const files = useMemo(() => {
    if (!current) return [];
    const filtered = current.files.filter((f) => {
      if (status !== "all" && f.badge !== status) return false;
      if (deferredQuery && !f.name.toLowerCase().includes(deferredQuery.toLowerCase())) return false;
      return true;
    });
    return sortFiles(filtered, sort);
  }, [current, status, deferredQuery, sort]);

  // Every hook has run by here, so an early return is safe.
  if (!current) {
    return <p className={styles.empty}>No files yet.</p>;
  }

  const semesterBytes = current.files.reduce((n, f) => n + f.size, 0);

  return (
    <div>
      <div className={styles.tabs}>
        {semesters.map((s, i) => (
          <button
            key={s.semester}
            className={`${styles.tab} ${i === active ? styles.active : ""}`}
            onClick={() => {
              setActive(i);
              resetFilters();
            }}
          >
            {s.semester}
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.statusPills}>
          {(["all", "new", "updated"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`${styles.pill} ${status === s ? styles.pillActive : ""}`}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? "All" : s === "new" ? "New" : "Updated"}
            </button>
          ))}
        </div>
        <label className={styles.sortWrap}>
          <span className={styles.sortLabel}>Sort</span>
          <select
            className={styles.sort}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort files"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <input
          className={styles.search}
          type="text"
          placeholder="Search files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.zipSlot}>
          <ZipButton
            subjectSlug={subjectSlug}
            semester={current.semester}
            label={current.semester}
            fileCount={current.files.length}
            totalBytes={semesterBytes}
          />
        </div>
      </div>

      {files.length === 0 ? (
        <p className={styles.empty} key="empty">
          {current.files.length === 0 ? "No files yet." : "No files match these filters."}
        </p>
      ) : (
        <div
          className={styles.grid}
          key={`${current.semester}-${sort}-${status}-${deferredQuery}`}
        >
          {files.map((f, i) => (
            <FileCard key={f.path} file={f} index={i} banner={f.badge ?? undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
