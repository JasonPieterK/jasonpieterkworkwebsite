"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowSquareOut,
  CaretDown,
  FilePdf,
  CheckCircle,
  DownloadSimple,
  Eye,
  EyeSlash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { FileEntry } from "@/lib/types";
import { extLabel, formatBytes, formatDate } from "@/lib/utils";
import FileIcon from "./FileIcon";
import { getInlinePreview } from "@/lib/preview";
import { prebuiltPdfUrlFor, rawUrlFor } from "@/lib/repoLinks";
import { downloadWithProgress } from "@/lib/download";
import { confettiScreen } from "@/lib/confetti";
import { canRenderDocx, printDocxAsPdf, type RenderStage } from "@/lib/docxRender";
import DocxPreview from "./DocxPreview";
import { useExitAnimation } from "@/lib/useExitAnimation";
import { useIsClient } from "@/lib/useIsClient";
import styles from "./DownloadModal.module.css";

type Version = { sha: string; date: string; message: string };
type DownloadState = {
  status: "idle" | "working" | "done" | "error";
  pct: number | null;
  bytes: number;
  error?: string;
};

const IDLE: DownloadState = { status: "idle", pct: null, bytes: 0 };

export default function DownloadModal({ file }: { file: FileEntry }) {
  const mounted = useIsClient();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Version | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [dl, setDl] = useState<DownloadState>(IDLE);
  const [pdf, setPdf] = useState<{ stage: RenderStage | null; error?: string }>({ stage: null });
  const [showPreview, setShowPreview] = useState(false);
  const shell = useExitAnimation(open, 280);
  const warnShell = useExitAnimation(warnOpen, 280);
  const dropdownShell = useExitAnimation(pickerOpen, 180);
  const previewShell = useExitAnimation(showPreview, 260);
  const pickerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const latest: Version = useMemo(
    () => ({ sha: "", date: file.lastCommitDate, message: file.lastCommitMessage }),
    [file.lastCommitDate, file.lastCommitMessage]
  );

  function openModal() {
    setSelected(latest);
    setPickerOpen(false);
    setDl(IDLE);
    setShowPreview(false);
    setOpen(true);

    // Version history is fetched once, on first open — a click is the trigger,
    // so it belongs here rather than in an effect watching `open`.
    if (versions === null && !loading) {
      setLoading(true);
      fetch(`/api/versions?path=${encodeURIComponent(file.path)}`)
        .then((r) => r.json())
        .then((data) => setVersions(Array.isArray(data) ? data : []))
        .catch(() => setVersions([]))
        .finally(() => setLoading(false));
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // The warning dialog sits on top; Escape should dismiss that first
      // rather than pulling the modal out from under it.
      if (warnOpen) setWarnOpen(false);
      else setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, warnOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  // Opening the list near the bottom of a scrolled body would otherwise leave
  // it below the fold with no hint that it is there.
  useEffect(() => {
    if (!pickerOpen) return;
    const id = requestAnimationFrame(() =>
      dropdownRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
    return () => cancelAnimationFrame(id);
  }, [pickerOpen]);

  // Abort an in-flight download if the card unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const list = versions ?? [];
  const downloadHref = selected?.sha
    ? `/api/download-version?path=${encodeURIComponent(file.path)}&sha=${selected.sha}&date=${encodeURIComponent(
        selected.date
      )}&message=${encodeURIComponent(selected.message)}`
    : file.downloadUrl;
  const selectedRawUrl = selected?.sha ? rawUrlFor(file.path, selected.sha) : file.downloadUrl;
  const preview = getInlinePreview(file.name, file.path, selectedRawUrl, selected?.sha || undefined);

  async function startDownload() {
    if (dl.status === "working") return;
    const controller = new AbortController();
    abortRef.current = controller;
    setDl({ status: "working", pct: 0, bytes: 0 });
    window.dispatchEvent(new Event("progress:start"));
    try {
      await downloadWithProgress(
        downloadHref,
        file.name,
        (pct, bytes) => setDl({ status: "working", pct, bytes }),
        controller.signal
      );
      setDl((d) => ({ status: "done", pct: 100, bytes: d.bytes }));
      confettiScreen();
      window.setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      if (controller.signal.aborted) return;
      setDl({
        status: "error",
        pct: null,
        bytes: 0,
        error: err instanceof Error ? err.message : "Download failed",
      });
    } finally {
      window.dispatchEvent(new Event("progress:done"));
    }
  }

  async function exportPdf() {
    if (pdf.stage) return;
    setPdf({ stage: "fetching" });
    window.dispatchEvent(new Event("progress:start"));
    try {
      // A GitHub Action converts each document with LibreOffice — a real print
      // engine — and publishes the result to the repo's `pdf` branch. Prefer
      // that: it is a straight download and matches Word far more closely than
      // anything a browser can lay out.
      //
      // Only the latest version is prebuilt, so an older version still goes
      // through the in-browser path, as does anything not yet converted.
      const prebuilt = selected?.sha ? null : prebuiltPdfUrlFor(file.path);
      if (prebuilt) {
        const head = await fetch(prebuilt, { method: "HEAD" }).catch(() => null);
        if (head?.ok) {
          await downloadWithProgress(
            prebuilt,
            file.name.replace(/\.docx?$/i, ".pdf"),
            (pct, bytes) => setDl({ status: "working", pct, bytes })
          );
          setDl((d) => ({ status: "done", pct: 100, bytes: d.bytes }));
          setPdf({ stage: null });
          confettiScreen();
          return;
        }
      }

      await printDocxAsPdf(selectedRawUrl, file.name, (stage) => setPdf({ stage }));
      setPdf({ stage: null });
    } catch (err) {
      setDl(IDLE);
      setPdf({ stage: null, error: err instanceof Error ? err.message : "Could not build the PDF" });
    } finally {
      window.dispatchEvent(new Event("progress:done"));
    }
  }

  const working = dl.status === "working";
  const pdfLabel =
    pdf.stage === "fetching"
      ? "Fetching…"
      : pdf.stage === "rendering"
        ? "Laying out…"
        : pdf.stage === "opening"
          ? "Opening…"
          : "Save as PDF";

  const progressBlock = (
    <>
      {(working || dl.status === "done") && (
        <div className={styles.progressWrap} aria-live="polite">
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={dl.pct ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Downloading ${file.name}`}
          >
            <div
              className={`${styles.progressBar} ${dl.pct === null ? styles.progressIndeterminate : ""}`}
              style={dl.pct === null ? undefined : { width: `${dl.pct}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {dl.status === "done" ? (
              <>
                <CheckCircle size={14} weight="fill" className={styles.doneIcon} /> Saved ·{" "}
                {formatBytes(dl.bytes)}
              </>
            ) : dl.pct === null ? (
              `Downloading… ${formatBytes(dl.bytes)}`
            ) : (
              `${Math.round(dl.pct)}% · ${formatBytes(dl.bytes)}`
            )}
          </span>
        </div>
      )}
      {dl.status === "error" && (
        <p className={styles.errorText}>
          <WarningCircle size={14} weight="bold" /> {dl.error} — try again.
        </p>
      )}
    </>
  );

  return (
    <>
      <button type="button" className="mmm-btn mmm-btn--ghost" onClick={openModal}>
        Open
      </button>
      {shell.mounted &&
        mounted &&
        createPortal(
          <div
            className={`${styles.overlay} ${shell.closing ? styles.overlayClosing : ""}`}
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              className={`${styles.modal} ${showPreview ? styles.modalWide : ""} ${
                shell.closing ? styles.modalClosing : ""
              }`}
              role="dialog"
              aria-modal="true"
              aria-label={`${file.name} — download options`}
            >
              <div className={styles.header}>
                <div className={styles.headerTitle}>
                  <span className={styles.iconBadge}>
                    <FileIcon name={file.name} size={22} weight="bold" aria-hidden="true" />
                  </span>
                  <h3 className={styles.name}>{file.name}</h3>
                </div>
                <button type="button" className={styles.closeBtn} aria-label="Close" onClick={() => setOpen(false)}>
                  <X size={18} weight="bold" />
                </button>
              </div>

              <div className={styles.body}>
                <div className={styles.fileMeta}>
                  <span className={styles.metaChip}>{extLabel(file.name)}</span>
                  {file.size > 0 && <span className={styles.metaChip}>{formatBytes(file.size)}</span>}
                  <span className={styles.metaDate}>{formatDate(file.lastCommitDate)}</span>
                </div>

                {previewShell.mounted && (preview || canRenderDocx(file.name)) && (
                  <div
                    className={`${styles.previewBox} ${previewShell.closing ? styles.previewClosing : ""}`}
                  >
                    {canRenderDocx(file.name) ? (
                      <DocxPreview url={selectedRawUrl} name={file.name} />
                    ) : preview?.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview.url} alt={file.name} className={styles.previewImg} />
                    ) : (
                      <iframe src={preview!.url} title={`Preview of ${file.name}`} className={styles.previewFrame} />
                    )}
                    {preview && !canRenderDocx(file.name) && (
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.previewOut}
                    >
                      <ArrowSquareOut size={13} weight="bold" /> Open in new tab
                    </a>
                    )}
                  </div>
                )}

                <span className={styles.label}>Select version</span>
                <div className={styles.picker} ref={pickerRef}>
                  <button type="button" className={styles.pickerTrigger} onClick={() => setPickerOpen((v) => !v)}>
                    <span className={styles.pickerText}>
                      {!selected?.sha ? "Latest" : formatDate(selected.date)}
                      {selected?.message && <span className={styles.pickerMsg}> · {selected.message}</span>}
                    </span>
                    <CaretDown
                      size={14}
                      weight="bold"
                      className={`${styles.chevron} ${pickerOpen ? styles.chevronOpen : ""}`}
                    />
                  </button>
                  {dropdownShell.mounted && (
                    <div
                      ref={dropdownRef}
                      className={`${styles.dropdown} ${dropdownShell.closing ? styles.dropdownClosing : ""}`}
                    >
                      <button
                        type="button"
                        className={`${styles.option} ${!selected?.sha ? styles.optionActive : ""}`}
                        onClick={() => {
                          setSelected(latest);
                          setPickerOpen(false);
                        }}
                      >
                        <span className={styles.optionTag}>Latest</span>
                        <span className={styles.optionMsg}>{latest.message || "—"}</span>
                      </button>
                      {loading &&
                        [0, 1, 2].map((i) => (
                          <div key={i} className={styles.optionSkeleton} aria-hidden="true">
                            <span className={`skeleton ${styles.skelTag}`} />
                            <span className={`skeleton ${styles.skelMsg}`} />
                          </div>
                        ))}
                      {!loading &&
                        list
                          .filter((v) => v.date !== latest.date || v.message !== latest.message)
                          .map((v, i) => (
                            <button
                              key={v.sha}
                              type="button"
                              className={`${styles.option} ${selected?.sha === v.sha ? styles.optionActive : ""}`}
                              style={{ "--i": i } as React.CSSProperties}
                              onClick={() => {
                                setSelected(v);
                                setPickerOpen(false);
                              }}
                            >
                              <span className={styles.optionTag}>{formatDate(v.date)}</span>
                              <span className={styles.optionMsg}>{v.message || "—"}</span>
                            </button>
                          ))}
                    </div>
                  )}
                </div>

                <div className={styles.actionRow}>
                  {(preview || canRenderDocx(file.name)) && (
                    <button
                      type="button"
                      className={`mmm-btn mmm-btn--ghost ${styles.actionBtn}`}
                      aria-expanded={showPreview}
                      onClick={() => setShowPreview((v) => !v)}
                    >
                      {showPreview ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                      {showPreview ? "Hide preview" : "Preview"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`mmm-btn ${styles.actionBtn} ${styles.downloadBtn}`}
                    disabled={working}
                    onClick={() => (selected?.sha ? setWarnOpen(true) : startDownload())}
                  >
                    <DownloadSimple size={18} weight="bold" className={working ? styles.bouncing : undefined} />
                    {working ? "Downloading…" : dl.status === "done" ? "Downloaded" : "Download"}
                  </button>
                </div>

                {canRenderDocx(file.name) && (
                  <button
                    type="button"
                    className={`mmm-btn mmm-btn--ghost ${styles.pdfBtn}`}
                    onClick={exportPdf}
                    disabled={Boolean(pdf.stage)}
                    title="Convert this Word file to PDF in your browser and open the print dialog"
                  >
                    <FilePdf size={18} weight="bold" className={pdf.stage ? styles.bouncing : undefined} />
                    {pdfLabel}
                  </button>
                )}
                {pdf.error && (
                  <p className={styles.errorText}>
                    <WarningCircle size={14} weight="bold" /> {pdf.error}
                  </p>
                )}

                {progressBlock}
              </div>
            </div>
          </div>,
          document.body
        )}
      {warnShell.mounted &&
        mounted &&
        createPortal(
          <div
            className={`${styles.overlay} ${warnShell.closing ? styles.overlayClosing : ""}`}
            style={{ zIndex: 400 }}
            onMouseDown={(e) => e.target === e.currentTarget && setWarnOpen(false)}
          >
            <div
              className={`${styles.modal} ${warnShell.closing ? styles.modalClosing : ""}`}
              style={{ maxWidth: 420 }}
              role="alertdialog"
              aria-modal="true"
              aria-label="Not the latest version"
            >
              <div className={styles.header}>
                <div className={styles.headerTitle}>
                  <span className={styles.iconBadge} style={{ color: "#b45309", background: "#fef3c7" }}>
                    <WarningCircle size={22} weight="bold" aria-hidden="true" />
                  </span>
                  <h3 className={styles.name}>Not the latest version</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  aria-label="Close"
                  onClick={() => setWarnOpen(false)}
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
              <div className={styles.body}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
                  You&rsquo;re about to download an <strong>older version</strong> of{" "}
                  <strong>{file.name}</strong> from {selected ? formatDate(selected.date) : ""}.
                </p>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
                  <li>Some questions may be <strong>wrong or outdated</strong>.</li>
                  <li>Some questions may be <strong>unanswered</strong>.</li>
                  <li>Some answers may be <strong>unchecked or unverified</strong>.</li>
                  <li>This file does not reflect the latest corrections or updates.</li>
                </ul>
                <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--ash)" }}>
                  Proceed only if you specifically need this older version. Otherwise, cancel and download the
                  latest version instead.
                </p>
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={`mmm-btn mmm-btn--ghost ${styles.actionBtn}`}
                    onClick={() => setWarnOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`mmm-btn ${styles.actionBtn}`}
                    style={{ background: "#b45309", color: "#fff" }}
                    disabled={working}
                    onClick={() => {
                      setWarnOpen(false);
                      startDownload();
                    }}
                  >
                    <DownloadSimple size={18} weight="bold" />
                    Proceed anyway
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
