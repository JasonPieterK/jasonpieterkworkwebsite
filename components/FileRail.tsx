"use client";

import { useMemo } from "react";
import { Star } from "@phosphor-icons/react";
import type { Subject } from "@/lib/types";
import { STARRED_KEY, useLocalList } from "@/lib/useLocalList";
import FileCard from "./FileCard";
import styles from "./FileRail.module.css";

type Located = { subjectName: string; semester: string; file: Subject["semesters"][number]["files"][number] };

/**
 * "Starred" rail on the home page. Stars live in localStorage, so this
 * resolves stored paths against the subject list the server already sent —
 * no extra fetch, nothing to keep in sync.
 */
export default function FileRail({ subjects }: { subjects: Subject[] }) {
  const starred = useLocalList(STARRED_KEY);

  const byPath = useMemo(() => {
    const map = new Map<string, Located>();
    for (const subject of subjects) {
      for (const group of subject.semesters) {
        for (const file of group.files) {
          map.set(file.path, { subjectName: subject.name, semester: group.semester, file });
        }
      }
    }
    return map;
  }, [subjects]);

  const starredFiles = starred.items
    .map((p) => byPath.get(p))
    .filter((x): x is Located => Boolean(x));

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
          {starredFiles.map(({ subjectName, semester, file }, i) => (
            <div key={file.path} className={styles.item} style={{ "--i": i } as React.CSSProperties}>
              <p className={styles.crumb}>
                {subjectName} · {semester}
              </p>
              <FileCard file={file} index={i} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
