"use client";

import { useMemo, useState } from "react";
import type { FileEntry, SemesterGroup } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { getPreviewUrl } from "@/lib/preview";
import FileCard from "./FileCard";
import styles from "./SemesterTabs.module.css";

type StatusFilter = "all" | "added" | "modified";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function resetFilters() {
    setStatus("all");
    setQuery("");
    setDateFrom("");
    setDateTo("");
  }

  if (semesters.length === 0) {
    return <p className={styles.empty}>No files yet.</p>;
  }
  const current = semesters[active];

  const files = useMemo(() => {
    return current.files.filter((f) => {
      if (status !== "all" && f.changeKind !== status) return false;
      if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (dateFrom && (!f.lastCommitDate || f.lastCommitDate < dateFrom)) return false;
      if (dateTo && (!f.lastCommitDate || f.lastCommitDate > `${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [current, status, query, dateFrom, dateTo]);

  function bannerFor(file: FileEntry): "new" | "updated" | undefined {
    if (file.path === newestAddedPath) return "new";
    if (file.path === newestUpdatedPath) return "updated";
    return undefined;
  }

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
          {(["all", "added", "modified"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`${styles.pill} ${status === s ? styles.pillActive : ""}`}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? "All" : s === "added" ? "New" : "Updated"}
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
        <div className={styles.dateRange}>
          <input
            className={styles.dateInput}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <span className={styles.dateSep}>–</span>
          <input
            className={styles.dateInput}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
        </div>
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
        <div className={styles.list} key={current.semester}>
          <div className={styles.listHead}>
            <span>Name</span>
            <span>Release date</span>
            <span>Date modified</span>
            <span>Commit note</span>
            <span />
          </div>
          {files.map((f) => {
            const modified = f.lastCommitDate !== f.firstCommitDate ? formatDate(f.lastCommitDate) : "–";
            const previewUrl = getPreviewUrl(f);
            const banner = bannerFor(f);
            return (
              <div key={f.path} className={styles.listRow}>
                <span className={styles.listName}>
                  {f.name}
                  {banner && (
                    <span className={`${styles.listBadge} ${banner === "new" ? styles.badgeNew : styles.badgeUpdated}`}>
                      {banner === "new" ? "New" : "Updated"}
                    </span>
                  )}
                </span>
                <span title={f.firstCommitDate}>
                  {f.firstCommitDate ? formatDate(f.firstCommitDate) : "–"}
                </span>
                <span title={f.lastCommitDate}>{modified}</span>
                <span className={styles.listNote}>{f.lastCommitMessage || "–"}</span>
                <span className={styles.listActions}>
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="mmm-btn mmm-btn--ghost">
                      Preview
                    </a>
                  )}
                  <a href={f.downloadUrl} className="mmm-btn mmm-btn--ghost" download>
                    Download
                  </a>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
