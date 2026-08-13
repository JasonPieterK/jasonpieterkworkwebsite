"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Subject } from "@/lib/types";
import FileCard from "./FileCard";
import styles from "./SearchResults.module.css";

export default function SearchResults({ subjects }: { subjects: Subject[] }) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    const results: { subjectName: string; semester: string; file: Subject["semesters"][number]["files"][number] }[] = [];
    for (const subject of subjects) {
      const subjectMatches = subject.name.toLowerCase().includes(q);
      for (const group of subject.semesters) {
        for (const file of group.files) {
          if (subjectMatches || file.name.toLowerCase().includes(q)) {
            results.push({ subjectName: subject.name, semester: group.semester, file });
          }
        }
      }
    }
    return results;
  }, [subjects, q]);

  if (!q) {
    return <p className={styles.hint}>Type something above to search files and subjects.</p>;
  }

  if (matches.length === 0) {
    return <p className={styles.hint}>No files match “{q}”.</p>;
  }

  return (
    <div className={styles.grid}>
      {matches.map(({ subjectName, semester, file }, i) => (
        <div key={file.path} className={styles.item}>
          <p className={styles.crumb}>
            {subjectName} · {semester}
          </p>
          <FileCard file={file} index={i} />
        </div>
      ))}
    </div>
  );
}
