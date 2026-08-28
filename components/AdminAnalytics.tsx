"use client";

import { useEffect, useState } from "react";
import { Download, Eye, DeviceMobile, Desktop, DeviceTablet } from "@phosphor-icons/react";
import styles from "./AdminAnalytics.module.css";

type Summary = {
  totalDownloads: number;
  totalVisits: number;
  topFiles: { key: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  osBreakdown: { os: string; count: number }[];
  downloadsByDevice: { device: string; count: number }[];
  recentEvents: {
    kind: string;
    key: string | null;
    device: string | null;
    browser: string | null;
    os: string | null;
    createdAt: string;
  }[];
};

const DEVICE_ICON: Record<string, React.ComponentType<{ size?: number; weight?: "bold" }>> = {
  mobile: DeviceMobile,
  tablet: DeviceTablet,
  desktop: Desktop,
};

function BarList({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  if (rows.length === 0) return <p className={styles.empty}>No data yet.</p>;
  return (
    <div className={styles.barList}>
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <div key={r.label} className={styles.barRow}>
            <span className={styles.barLabel}>{r.label}</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.barCount}>
              {r.count} <span className={styles.barPct}>({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminAnalytics({ token }: { token: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin?action=analytics", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setError("Failed to load analytics"));
  }, [token]);

  if (error) return <p className={styles.empty}>{error}</p>;
  if (!summary) return <p className={styles.empty}>Loading…</p>;

  const deviceTotal = summary.deviceBreakdown.reduce((n, r) => n + r.count, 0);
  const browserTotal = summary.browserBreakdown.reduce((n, r) => n + r.count, 0);
  const osTotal = summary.osBreakdown.reduce((n, r) => n + r.count, 0);
  const downloadDeviceTotal = summary.downloadsByDevice.reduce((n, r) => n + r.count, 0);
  const topFilesTotal = summary.topFiles.reduce((n, r) => n + r.count, 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <Download size={22} weight="bold" />
          <div>
            <p className={styles.statNum}>{summary.totalDownloads}</p>
            <p className={styles.statLabel}>Total downloads</p>
          </div>
        </div>
        <div className={styles.stat}>
          <Eye size={22} weight="bold" />
          <div>
            <p className={styles.statNum}>{summary.totalVisits}</p>
            <p className={styles.statLabel}>Page visits (recent)</p>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={`mmm-card ${styles.card}`}>
          <h3 className="h4">Most downloaded files</h3>
          <BarList
            rows={summary.topFiles.map((f) => ({ label: f.key.split("/").pop() ?? f.key, count: f.count }))}
            total={topFilesTotal}
          />
        </section>

        <section className={`mmm-card ${styles.card}`}>
          <h3 className="h4">Devices</h3>
          <BarList rows={summary.deviceBreakdown.map((d) => ({ label: d.device, count: d.count }))} total={deviceTotal} />
        </section>

        <section className={`mmm-card ${styles.card}`}>
          <h3 className="h4">Browsers</h3>
          <BarList
            rows={summary.browserBreakdown.map((b) => ({ label: b.browser, count: b.count }))}
            total={browserTotal}
          />
        </section>

        <section className={`mmm-card ${styles.card}`}>
          <h3 className="h4">Operating systems</h3>
          <BarList rows={summary.osBreakdown.map((o) => ({ label: o.os, count: o.count }))} total={osTotal} />
        </section>

        <section className={`mmm-card ${styles.card}`}>
          <h3 className="h4">What devices download</h3>
          <BarList
            rows={summary.downloadsByDevice.map((d) => ({ label: d.device, count: d.count }))}
            total={downloadDeviceTotal}
          />
        </section>

        <section className={`mmm-card ${styles.card} ${styles.activityCard}`}>
          <h3 className="h4">Recent activity</h3>
          {summary.recentEvents.length === 0 ? (
            <p className={styles.empty}>No activity yet.</p>
          ) : (
            <ul className={styles.activityList}>
              {summary.recentEvents.map((e, i) => {
                const Icon =
                  e.kind === "download" ? Download : DEVICE_ICON[e.device ?? ""] ?? Eye;
                return (
                  <li key={i} className={styles.activityRow}>
                    <Icon size={14} weight="bold" />
                    <span className={styles.activityKind}>{e.kind === "download" ? "Download" : "Visit"}</span>
                    <span className={styles.activityKey}>
                      {e.kind === "download" ? e.key?.split("/").pop() : e.key}
                    </span>
                    <span className={styles.activityMeta}>
                      {e.device ?? "?"} · {e.browser ?? "?"} · {e.os ?? "?"}
                    </span>
                    <span className={styles.activityTime}>{relativeTime(e.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
