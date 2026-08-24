"use client";

import { useEffect, useMemo } from "react";
import { Star } from "@phosphor-icons/react";
import { toFileEntry, type SearchIndex } from "@/lib/searchIndex";
import { STARRED_KEY, useLocalList } from "@/lib/useLocalList";
import FileCard from "./FileCard";
import styles from "./FileRail.module.css";



/**
 * "Starred" rail on the home page. Stars live in localStorage, so this
 * resolves stored paths against the subject list the server already sent —
 * no extra fetch, nothing to keep in sync.
 */
export default function FileRail({ index }: { index: SearchIndex }) {
  const starred = useLocalList(STARRED_KEY);

  const byPath = useMemo(
    () => new Map(index.files.map((f) => [f.path, f])),
    [index]
  );

  const starredFiles = starred.items
    .map((p) => byPath.get(p))
    .filter((f) => f !== undefined);

  // Files renamed or removed upstream stay in localStorage forever otherwise,
  // silently eating the cap until starring something new evicts a live entry.
  const stale = starred.items.length - starredFiles.length;
  useEffect(() => {
    if (stale > 0) starred.keepOnly((p) => byPath.has(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  if (starredFiles.length === 0) return null;

  return (
    <div className={styles.rails}>
      <section className={styles.rail}>
        <div className={styles.railHead}>
          <h2 className={styles.railTitle}>
            <Star size={18} weight="fill" className={styles.starIcon} />
            Starred
            <span className={styles.count}>{starredFiles.length}</span>
          </h2>
          <button type="button" className={styles.clear} onClick={starred.clear}>
            Clear
          </button>
        </div>
        <div className={styles.railGrid}>
          {starredFiles.map((item, i) => (
            <div key={item.path} className={styles.item} style={{ "--i": i } as React.CSSProperties}>
              <p className={styles.crumb}>
                {item.subject} · {item.semester}
              </p>
              <FileCard file={toFileEntry(item)} index={i} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
