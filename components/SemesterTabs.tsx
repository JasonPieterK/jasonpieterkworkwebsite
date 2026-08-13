"use client";

import { useState } from "react";
import type { SemesterGroup } from "@/lib/types";
import FileCard from "./FileCard";
import styles from "./SemesterTabs.module.css";

export default function SemesterTabs({ semesters }: { semesters: SemesterGroup[] }) {
  const [active, setActive] = useState(0);
  if (semesters.length === 0) {
    return <p className={styles.empty}>No files yet.</p>;
  }
  const current = semesters[active];

  return (
    <div>
      <div className={styles.tabs}>
        {semesters.map((s, i) => (
          <button
            key={s.semester}
            className={`${styles.tab} ${i === active ? styles.active : ""}`}
            onClick={() => setActive(i)}
          >
            {s.semester}
          </button>
        ))}
      </div>
      <div className={styles.grid} key={current.semester}>
        {current.files.map((f, i) => (
          <FileCard key={f.path} file={f} index={i} />
        ))}
      </div>
    </div>
  );
}
