"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FileEntry, SemesterGroup } from "@/lib/types";
import { extLabel, formatBytes, formatDate } from "@/lib/utils";
import { SORTS, sortFiles, type SortKey } from "@/lib/sort";
import { fileIconFor } from "@/lib/fileIcon";
import FileCard from "./FileCard";
import DownloadModal from "./DownloadModal";
import StarButton from "./StarButton";
import ZipButton from "./ZipButton";
import styles from "./SemesterTabs.module.css";

type StatusFilter = "all" | "new" | "updated";

export default function SemesterTabs({
  subjectSlug,
  semesters,
  newestAddedPath,
  newestUpdatedPath,
}: {
  subjectSlug: string;
  semesters: SemesterGroup[];
  newestAddedPath?: string;
  newestUpdatedPath?: string;
}) {
  const [active, setActive] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isMobile, setIsMobile] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const searchParams = useSearchParams();
  const focusPath = searchParams.get("file");

  // Deep link from the command palette (?file=<path>): jump to the semester
  // that holds it and filter down to that one file.
  useEffect(() => {
    if (!focusPath) return;
    const i = semesters.findIndex((g) => g.files.some((f) => f.path === focusPath));
    if (i === -1) return;
    setActive(i);
    setStatus("all");
    setQuery(focusPath.split("/").pop() ?? "");
  }, [focusPath, semesters]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const effectiveView = isMobile ? "grid" : view;

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
    const filtered = current.files.filter((f) => {
      if (status !== "all" && bannerFor(f) !== status) return false;
      if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    return sortFiles(filtered, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, status, query, sort, newestAddedPath, newestUpdatedPath]);

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
        {!isMobile && (
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
        )}
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
        <p className={styles.empty}>No files match these filters.</p>
      ) : effectiveView === "grid" ? (
        <div className={styles.grid} key={`${current.semester}-${sort}`}>
          {files.map((f, i) => (
            <FileCard key={f.path} file={f} index={i} banner={bannerFor(f)} />
          ))}
        </div>
      ) : (
        <div className={styles.listWrap} key={`${current.semester}-${sort}`}>
          <table className={styles.list}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Release date</th>
                <th>Date modified</th>
                <th>Commit note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const modified = f.lastCommitDate !== f.firstCommitDate ? formatDate(f.lastCommitDate) : "–";
                const banner = bannerFor(f);
                const Icon = fileIconFor(f.name);
                return (
                  <tr key={f.path}>
                    <td>
                      <div className={styles.listName}>
                        <Icon size={18} weight="bold" className={styles.listIcon} aria-hidden="true" />
                        {f.name}
                        {banner && (
                          <span
                            className={`${styles.listBadge} ${banner === "new" ? styles.badgeNew : styles.badgeUpdated}`}
                          >
                            {banner === "new" ? "New" : "Updated"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Type" className={styles.listMono}>
                      {extLabel(f.name)}
                    </td>
                    <td data-label="Size" className={styles.listMono}>
                      {formatBytes(f.size) || "–"}
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
                    <td>
                      <div className={styles.listActions}>
                        <StarButton path={f.path} label={f.name} />
                        <DownloadModal file={f} />
                      </div>
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
