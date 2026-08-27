"use client";

import { useState } from "react";
import { FileZip, WarningCircle } from "@phosphor-icons/react";
import { downloadWithProgress } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import { confettiScreen } from "@/lib/confetti";
import styles from "./ZipButton.module.css";

/**
 * Downloads a whole subject (or one semester) as a zip, with the same
 * streaming progress bar the single-file download uses.
 */
export default function ZipButton({
  subjectSlug,
  semester,
  label,
  fileCount,
  totalBytes,
}: {
  subjectSlug: string;
  semester?: string;
  label: string;
  fileCount: number;
  totalBytes: number;
}) {
  const [pct, setPct] = useState<number | null>(null);
  const [bytes, setBytes] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setWarning(null);
    setPct(0);
    setBytes(0);
    window.dispatchEvent(new Event("progress:start"));
    const url = `/api/zip?subject=${encodeURIComponent(subjectSlug)}${
      semester ? `&semester=${encodeURIComponent(semester)}` : ""
    }`;
    try {
      await downloadWithProgress(
        url,
        `${label}.zip`,
        (p, b) => {
          setPct(p);
          setBytes(b);
        },
        undefined,
        (res) => {
          // The route skips files it could not fetch rather than failing the
          // whole archive; without this the zip just looks complete.
          const missing = Number(res.headers.get("X-Zip-Missing-Files")) || 0;
          if (missing > 0) {
            setWarning(
              `${missing} file${missing === 1 ? "" : "s"} could not be included — download ${
                missing === 1 ? "it" : "them"
              } individually.`
            );
          }
        },
        `zip:${subjectSlug}${semester ? `/${semester}` : ""}`
      );
      confettiScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zip failed");
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event("progress:done"));
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`mmm-btn mmm-btn--mode ${styles.btn}`}
        onClick={run}
        disabled={busy || fileCount === 0}
        title={`Download all ${fileCount} file${fileCount === 1 ? "" : "s"} in ${semester ?? "this subject"} as a zip`}
      >
        <FileZip size={18} weight="bold" className={busy ? styles.busyIcon : undefined} />
        {busy ? "Zipping…" : `Download all (${fileCount})`}
        {!busy && totalBytes > 0 && <span className={styles.size}>{formatBytes(totalBytes)}</span>}
      </button>
      {busy && (
        <div className={styles.progressTrack} aria-live="polite">
          <div
            className={`${styles.progressBar} ${pct === null ? styles.indeterminate : ""}`}
            style={pct === null ? undefined : { width: `${pct}%` }}
          />
          <span className={styles.progressText}>
            {pct === null ? `Building zip… ${formatBytes(bytes)}` : `${Math.round(pct)}% · ${formatBytes(bytes)}`}
          </span>
        </div>
      )}
      {error && (
        <p className={styles.error}>
          <WarningCircle size={14} weight="bold" /> {error}
        </p>
      )}
      {warning && !error && (
        <p className={styles.warning}>
          <WarningCircle size={14} weight="bold" /> {warning}
        </p>
      )}
    </div>
  );
}
