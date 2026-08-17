"use client";

import { useMemo, useState } from "react";
import type { FileEntry, SemesterGroup } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { getPreviewUrl } from "@/lib/preview";
import { fileIconFor } from "@/lib/fileIcon";
import FileCard from "./FileCard";
import styles from "./SemesterTabs.module.css";

type StatusFilter = "all" | "new" | "updated";

export default function SemesterTabs({
  semesters,
  newestAddedPath,
  newestUpdatedPath,
}: {
  semesters: SemesterGroup[];
  newestAddedPath?: string;
  newestUpdatedPath?: string;
}) {
  const [active, setActive] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  function resetFilters() {
    setStatus("all");
    setQuery("");
  }

  if (semesters.length === 0) {
    return <p className={styles.empty}>No files yet.</p>;
  }
  const current = semesters[active];

  function bannerFor(file: FileEntry): "new" | "updated" | undefined {
    if (file.path === newestAddedPath) return "new";
    if (file.path === newestUpdatedPath) return "updated";
    return undefined;
  }

  const files = useMemo(() => {
    return current.files.filter((f) => {
      if (status !== "all" && bannerFor(f) !== status) return false;
      if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, status, query, newestAddedPath, newestUpdatedPath]);

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
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === "grid" ? styles.viewActive : ""}`}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            className={`${styles.viewBtn} ${view === "list" ? styles.viewActive : ""}`}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            List
          </button>
        </div>
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
        <input
          className={styles.search}
          type="text"
          placeholder="Search files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {files.length === 0 ? (
        <p className={styles.empty}>No files match these filters.</p>
      ) : view === "grid" ? (
        <div className={styles.grid} key={current.semester}>
          {files.map((f, i) => (
            <FileCard key={f.path} file={f} index={i} banner={bannerFor(f)} />
          ))}
        </div>
      ) : (
        <div className={styles.listWrap} key={current.semester}>
          <table className={styles.list}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Release date</th>
                <th>Date modified</th>
                <th>Commit note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const modified = f.lastCommitDate !== f.firstCommitDate ? formatDate(f.lastCommitDate) : "–";
                const previewUrl = getPreviewUrl(f);
                const banner = bannerFor(f);
                const Icon = fileIconFor(f.name);
                return (
                  <tr key={f.path}>
                    <td className={styles.listName}>
                      <Icon size={18} weight="bold" className={styles.listIcon} aria-hidden="true" />
                      {f.name}
                      {banner && (
                        <span
                          className={`${styles.listBadge} ${banner === "new" ? styles.badgeNew : styles.badgeUpdated}`}
                        >
                          {banner === "new" ? "New" : "Updated"}
                        </span>
                      )}
                    </td>
                    <td data-label="Release date" title={f.firstCommitDate}>
                      {f.firstCommitDate ? formatDate(f.firstCommitDate) : "–"}
                    </td>
                    <td data-label="Date modified" title={f.lastCommitDate}>
                      {modified}
                    </td>
                    <td className={styles.listNote} data-label="Commit note">
                      {f.lastCommitMessage || "–"}
                    </td>
                    <td className={styles.listActions}>
                      {previewUrl && (
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="mmm-btn mmm-btn--ghost">
                          Preview
                        </a>
                      )}
                      <a href={f.downloadUrl} className="mmm-btn mmm-btn--ghost" download>
                        Download
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
