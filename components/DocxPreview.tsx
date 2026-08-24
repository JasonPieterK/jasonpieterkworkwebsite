"use client";

import { useEffect, useRef, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { renderDocxInto, type RenderStage } from "@/lib/docxRender";
import styles from "./DocxPreview.module.css";

const STAGE_TEXT: Record<RenderStage, string> = {
  fetching: "Fetching document…",
  rendering: "Laying out pages…",
  opening: "Opening…",
};

/**
 * Renders a .docx inline, the way Word lays it out. Replaces the Google Docs
 * viewer iframe, which was unreadable on a phone because it scaled a whole
 * desktop page into a small box with its own chrome around it.
 */
export default function DocxPreview({ url, name }: { url: string; name: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<RenderStage | null>("fetching");
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // Word pages are ~816px wide (Letter at 96dpi); a phone is 375px. `fit` is
  // the scale that makes a page exactly fill the available width, so "100%"
  // means "fits the screen" rather than "actual size, now go scroll sideways".
  const [fit, setFit] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    const host = hostRef.current;
    if (!host) return;

    setError(null);
    setStage("fetching");
    renderDocxInto(url, host, setStage, controller.signal)
      .then(() => {
        if (controller.signal.aborted) return;
        setStage(null);
        measureFit();
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not display this document");
        setStage(null);
      });

    function measureFit() {
      const page = host?.querySelector<HTMLElement>("section.docx");
      const available = host?.parentElement?.clientWidth ?? 0;
      if (!page || !available) return;
      const pageWidth = page.offsetWidth;
      if (!pageWidth) return;
      // Never scale up past 1: a big screen shows the page at its true size.
      setFit(Math.min(1, available / pageWidth));
    }

    const observer = new ResizeObserver(measureFit);
    if (host.parentElement) observer.observe(host.parentElement);

    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [url]);

  return (
    <div className={styles.wrap}>
      {stage && (
        <div className={styles.status}>
          <span className={`skeleton ${styles.bar}`} />
          {STAGE_TEXT[stage]}
        </div>
      )}
      {error && (
        <p className={styles.error}>
          <WarningCircle size={15} weight="bold" /> {error}
        </p>
      )}

      <div className={styles.controls} hidden={Boolean(stage || error)}>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
          aria-label="Zoom out"
        >
          −
        </button>
        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))}
          aria-label="Zoom in"
        >
          +
        </button>
        <button type="button" className={styles.zoomBtn} onClick={() => setZoom(1)} aria-label="Reset zoom">
          Fit
        </button>
      </div>

      <div className={styles.scroller}>
        <div
          ref={hostRef}
          className={styles.page}
          style={{ zoom: fit * zoom } as React.CSSProperties}
          aria-label={`Preview of ${name}`}
        />
      </div>
    </div>
  );
}
