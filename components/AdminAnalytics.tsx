"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  DeviceMobile,
  Desktop,
  DeviceTablet,
  MagnifyingGlass,
  LockKey,
  Users,
  ArrowsClockwise,
  Clock,
  DownloadSimple,
} from "@phosphor-icons/react";
import styles from "./AdminAnalytics.module.css";

type RawEvent = {
  id: string;
  kind: string;
  key: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  deviceModel: string | null;
  screen: string | null;
  language: string | null;
  userAgent: string | null;
  ip: string | null;
  sessionId: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  durationSeconds: number | null;
  createdAt: string;
};

type Summary = {
  totalDownloads: number;
  totalVisits: number;
  totalSearches: number;
  totalFailedUnlocks: number;
  totalSessions: number;
  returningSessions: number;
  topFiles: { key: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  osBreakdown: { os: string; count: number }[];
  modelBreakdown: { model: string; count: number }[];
  downloadsByDevice: { device: string; count: number }[];
  countryBreakdown: { country: string; count: number }[];
  referrerBreakdown: { referrer: string; count: number }[];
  subjectPopularity: { subject: string; count: number }[];
  searchQueries: { query: string; count: number }[];
  peakHours: number[][];
  avgDurationSeconds: number | null;
  downloadDetails: RawEvent[];
  visitDetails: RawEvent[];
  searchDetails: RawEvent[];
  failedUnlockDetails: RawEvent[];
  sessions: { sessionId: string; events: RawEvent[] }[];
  timeSeries: { date: string; downloads: number; visits: number }[];
  recentEvents: RawEvent[];
};

type Range = "1d" | "7d" | "30d" | "all";
const RANGES: { key: Range; label: string }[] = [
  { key: "1d", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEVICE_ICON: Record<string, React.ComponentType<{ size?: number; weight?: "bold" }>> = {
  mobile: DeviceMobile,
  tablet: DeviceTablet,
  desktop: Desktop,
};

const KIND_ICON: Record<string, React.ComponentType<{ size?: number; weight?: "bold" }>> = {
  download: Download,
  visit: Eye,
  search: MagnifyingGlass,
  failed_unlock: LockKey,
};

function BarList({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  if (rows.length === 0) return <p className={styles.empty}>No data yet.</p>;
  return (
    <div className={styles.barList}>
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <div key={r.label} className={styles.barRow}>
            <div className={styles.barLabelRow}>
              <span className={styles.barLabel}>{r.label}</span>
              <span className={styles.barCount}>
                {r.count} <span className={styles.barPct}>({pct}%)</span>
              </span>
            </div>
            <div className={styles.barTrackRow}>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

/** Grouped bar chart, hand-rolled in SVG — no chart library for two series over a few weeks. */
function TimeSeriesChart({ data }: { data: { date: string; downloads: number; visits: number }[] }) {
  if (data.length === 0) return <p className={styles.empty}>No activity in this range.</p>;

  const width = 720;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 28, left: 32 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((d) => Math.max(d.downloads, d.visits)));
  const groupW = plotW / data.length;
  const barW = Math.min(18, groupW / 3);

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart} role="img" aria-label="Downloads and visits over time">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + plotH * (1 - t);
          return (
            <g key={t}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className={styles.gridLine} />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" className={styles.axisText}>
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const groupX = padding.left + i * groupW + groupW / 2;
          const dH = (d.downloads / max) * plotH;
          const vH = (d.visits / max) * plotH;
          return (
            <g key={d.date}>
              <rect
                x={groupX - barW - 2}
                y={padding.top + plotH - dH}
                width={barW}
                height={dH}
                className={styles.barDownloads}
              >
                <title>{`${d.date}: ${d.downloads} downloads`}</title>
              </rect>
              <rect x={groupX + 2} y={padding.top + plotH - vH} width={barW} height={vH} className={styles.barVisits}>
                <title>{`${d.date}: ${d.visits} visits`}</title>
              </rect>
              {(data.length <= 10 || i % Math.ceil(data.length / 10) === 0) && (
                <text x={groupX} y={height - 8} textAnchor="middle" className={styles.axisText}>
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.swatchDownloads}`} /> Downloads
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.swatchVisits}`} /> Visits
        </span>
      </div>
    </div>
  );
}

/** Weekday x hour-of-day heatmap — shows when the site is actually used. */
function PeakHoursHeatmap({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapGrid}>
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className={styles.heatmapHourLabel}>
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
        {DAY_NAMES.map((day, dayIdx) => (
          <Fragment key={day}>
            <div className={styles.heatmapDayLabel}>{day}</div>
            {matrix[dayIdx].map((count, hour) => {
              const intensity = count / max;
              return (
                <div
                  key={hour}
                  className={styles.heatmapCell}
                  style={{ background: count === 0 ? undefined : `rgba(45, 127, 249, ${0.15 + intensity * 0.75})` }}
                  title={`${day} ${hour}:00 — ${count} event${count === 1 ? "" : "s"}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** Shared row-per-event table with an expandable detail row — used for downloads, visits, and failed unlocks. */
function EventDetailTable({
  title,
  emptyText,
  keyLabel,
  events,
  expandedId,
  onToggle,
}: {
  title: string;
  emptyText: string;
  keyLabel: string;
  events: RawEvent[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <section className={`mmm-card ${styles.card} ${styles.wideCard}`}>
      <h3 className="h4">{title}</h3>
      {events.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>{keyLabel}</th>
                <th>Device</th>
                <th>Model</th>
                <th>Browser</th>
                <th>OS</th>
                <th>Location</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <Fragment key={e.id}>
                  <tr className={styles.tableRow} onClick={() => onToggle(expandedId === e.id ? null : e.id)}>
                    <td className={styles.tableTime}>{formatExact(e.createdAt)}</td>
                    <td className={styles.tableFile} title={e.key ?? ""}>
                      {keyLabel === "File" ? e.key?.split("/").pop() ?? "—" : e.key ?? "—"}
                    </td>
                    <td>{e.device ?? "—"}</td>
                    <td>{e.deviceModel ?? "—"}</td>
                    <td>{e.browser ?? "—"}</td>
                    <td>{e.os ?? "—"}</td>
                    <td>{e.city && e.country ? `${e.city}, ${e.country}` : e.country ?? "—"}</td>
                    <td className={styles.tableTime}>{e.ip ?? "—"}</td>
                  </tr>
                  {expandedId === e.id && (
                    <tr className={styles.detailRow}>
                      <td colSpan={8}>
                        <div className={styles.detailGrid}>
                          <span>
                            <strong>IP:</strong> {e.ip || "—"}
                          </span>
                          <span>
                            <strong>Location:</strong> {e.city && e.country ? `${e.city}, ${e.country}` : e.country || "—"}
                          </span>
                          <span>
                            <strong>Screen:</strong> {e.screen || "—"}
                          </span>
                          <span>
                            <strong>Language:</strong> {e.language || "—"}
                          </span>
                          <span>
                            <strong>Referrer:</strong> {e.referrer || "direct"}
                          </span>
                          <span>
                            <strong>Time on page:</strong> {formatDuration(e.durationSeconds)}
                          </span>
                          <span>
                            <strong>Session:</strong> {e.sessionId ? e.sessionId.slice(0, 8) : "—"}
                          </span>
                          <span className={styles.detailUa}>
                            <strong>User agent:</strong> {e.userAgent || "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminAnalytics({ token }: { token: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<Range>("30d");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin?action=analytics&range=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load analytics");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, range]);

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/admin?action=exportCsv&range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${range}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const deviceTotal = useMemo(() => summary?.deviceBreakdown.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const browserTotal = useMemo(() => summary?.browserBreakdown.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const osTotal = useMemo(() => summary?.osBreakdown.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const modelTotal = useMemo(() => summary?.modelBreakdown.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const downloadDeviceTotal = useMemo(() => summary?.downloadsByDevice.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const topFilesTotal = useMemo(() => summary?.topFiles.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const countryTotal = useMemo(() => summary?.countryBreakdown.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const referrerTotal = useMemo(() => summary?.referrerBreakdown.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const subjectTotal = useMemo(() => summary?.subjectPopularity.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);
  const searchTotal = useMemo(() => summary?.searchQueries.reduce((n, r) => n + r.count, 0) ?? 0, [summary]);

  if (error) return <p className={styles.empty}>{error}</p>;

  return (
    <div className={styles.wrap}>
      <div className={styles.rangeBar}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ""}`}
            onClick={() => {
              setLoading(true);
              setRange(r.key);
            }}
          >
            {r.label}
          </button>
        ))}
        {loading && summary && <span className={styles.rangeLoading}>Updating…</span>}
        <button type="button" className={styles.exportBtn} onClick={exportCsv} disabled={exporting || !summary}>
          <DownloadSimple size={14} weight="bold" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {!summary ? (
        <p className={styles.empty}>Loading…</p>
      ) : (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <Download size={22} weight="bold" />
              <div>
                <p className={styles.statNum}>{summary.totalDownloads}</p>
                <p className={styles.statLabel}>Downloads</p>
              </div>
            </div>
            <div className={styles.stat}>
              <Eye size={22} weight="bold" />
              <div>
                <p className={styles.statNum}>{summary.totalVisits}</p>
                <p className={styles.statLabel}>Page visits</p>
              </div>
            </div>
            <div className={styles.stat}>
              <MagnifyingGlass size={22} weight="bold" />
              <div>
                <p className={styles.statNum}>{summary.totalSearches}</p>
                <p className={styles.statLabel}>Searches</p>
              </div>
            </div>
            <div className={styles.stat}>
              <LockKey size={22} weight="bold" />
              <div>
                <p className={styles.statNum}>{summary.totalFailedUnlocks}</p>
                <p className={styles.statLabel}>Failed unlocks</p>
              </div>
            </div>
            <div className={styles.stat}>
              <Users size={22} weight="bold" />
              <div>
                <p className={styles.statNum}>{summary.totalSessions}</p>
                <p className={styles.statLabel}>Sessions</p>
              </div>
            </div>
            <div className={styles.stat}>
              <ArrowsClockwise size={22} weight="bold" />
              <div>
                <p className={styles.statNum}>{summary.returningSessions}</p>
                <p className={styles.statLabel}>Returning</p>
              </div>
            </div>
            <div className={styles.stat}>
              <Clock size={22} weight="bold" />
              <div>
                <p className={styles.statNum}>{formatDuration(summary.avgDurationSeconds)}</p>
                <p className={styles.statLabel}>Avg. time on page</p>
              </div>
            </div>
          </div>

          <section className={`mmm-card ${styles.card} ${styles.chartCard}`}>
            <h3 className="h4">Activity over time</h3>
            <TimeSeriesChart data={summary.timeSeries} />
          </section>

          <section className={`mmm-card ${styles.card} ${styles.chartCard}`}>
            <h3 className="h4">Peak hours</h3>
            <PeakHoursHeatmap matrix={summary.peakHours} />
          </section>

          <div className={styles.grid}>
            <section className={`mmm-card ${styles.card}`}>
              <h3 className="h4">Most downloaded files</h3>
              <BarList
                rows={summary.topFiles.map((f) => ({ label: f.key.split("/").pop() ?? f.key, count: f.count }))}
                total={topFilesTotal}
              />
            </section>

            <section className={`mmm-card ${styles.card}`}>
              <h3 className="h4">Most popular subjects</h3>
              <BarList rows={summary.subjectPopularity.map((s) => ({ label: s.subject, count: s.count }))} total={subjectTotal} />
            </section>

            <section className={`mmm-card ${styles.card}`}>
              <h3 className="h4">Search queries</h3>
              <BarList rows={summary.searchQueries.map((s) => ({ label: s.query, count: s.count }))} total={searchTotal} />
            </section>

            <section className={`mmm-card ${styles.card}`}>
              <h3 className="h4">Device type</h3>
              <BarList rows={summary.deviceBreakdown.map((d) => ({ label: d.device, count: d.count }))} total={deviceTotal} />
            </section>

            <section className={`mmm-card ${styles.card}`}>
              <h3 className="h4">Device model</h3>
              <BarList rows={summary.modelBreakdown.map((m) => ({ label: m.model, count: m.count }))} total={modelTotal} />
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
              <h3 className="h4">Downloads by device type</h3>
              <BarList
                rows={summary.downloadsByDevice.map((d) => ({ label: d.device, count: d.count }))}
                total={downloadDeviceTotal}
              />
            </section>

            <section className={`mmm-card ${styles.card}`}>
              <h3 className="h4">Countries</h3>
              <BarList rows={summary.countryBreakdown.map((c) => ({ label: c.country, count: c.count }))} total={countryTotal} />
            </section>

            <section className={`mmm-card ${styles.card}`}>
              <h3 className="h4">Referrers</h3>
              <BarList
                rows={summary.referrerBreakdown.map((r) => ({ label: r.referrer, count: r.count }))}
                total={referrerTotal}
              />
            </section>
          </div>

          <section className={`mmm-card ${styles.card} ${styles.wideCard}`}>
            <h3 className="h4">Recent sessions</h3>
            {summary.sessions.length === 0 ? (
              <p className={styles.empty}>No sessions in this range.</p>
            ) : (
              <ul className={styles.sessionList}>
                {summary.sessions.map((s) => (
                  <li key={s.sessionId} className={styles.sessionRow}>
                    <span className={styles.sessionId}>{s.sessionId.slice(0, 8)}</span>
                    <span className={styles.sessionPath}>
                      {s.events.map((e, i) => (
                        <span key={e.id} className={styles.sessionStep}>
                          {i > 0 && " → "}
                          {e.kind === "download" ? (
                            <strong>{e.key?.split("/").pop() ?? "download"}</strong>
                          ) : e.kind === "search" ? (
                            `"${e.key}"`
                          ) : (
                            e.key ?? e.kind
                          )}
                        </span>
                      ))}
                    </span>
                    <span className={styles.sessionMeta}>
                      {s.events[0]?.deviceModel ?? s.events[0]?.device ?? "?"} · {formatExact(s.events[s.events.length - 1].createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <EventDetailTable
            title="What each device downloaded"
            emptyText="No downloads in this range."
            keyLabel="File"
            events={summary.downloadDetails}
            expandedId={expandedId}
            onToggle={setExpandedId}
          />

          <EventDetailTable
            title="What each device visited"
            emptyText="No visits in this range."
            keyLabel="Page"
            events={summary.visitDetails}
            expandedId={expandedId}
            onToggle={setExpandedId}
          />

          <EventDetailTable
            title="Failed unlock attempts"
            emptyText="No failed unlock attempts in this range."
            keyLabel="File"
            events={summary.failedUnlockDetails}
            expandedId={expandedId}
            onToggle={setExpandedId}
          />

          <section className={`mmm-card ${styles.card} ${styles.wideCard}`}>
            <h3 className="h4">Recent activity</h3>
            {summary.recentEvents.length === 0 ? (
              <p className={styles.empty}>No activity yet.</p>
            ) : (
              <ul className={styles.activityList}>
                {summary.recentEvents.map((e) => {
                  const Icon = KIND_ICON[e.kind] ?? DEVICE_ICON[e.device ?? ""] ?? Eye;
                  return (
                    <li key={e.id} className={styles.activityRow}>
                      <Icon size={14} weight="bold" />
                      <span className={styles.activityKind}>
                        {e.kind === "download"
                          ? "Download"
                          : e.kind === "search"
                            ? "Search"
                            : e.kind === "failed_unlock"
                              ? "Failed unlock"
                              : "Visit"}
                      </span>
                      <span className={styles.activityKey}>
                        {e.kind === "download" || e.kind === "failed_unlock" ? e.key?.split("/").pop() : e.key}
                      </span>
                      <span className={styles.activityMeta}>
                        {e.deviceModel ?? e.device ?? "?"} · {e.browser ?? "?"} · {e.os ?? "?"}
                        {e.city ? ` · ${e.city}` : e.country ? ` · ${e.country}` : ""}
                        {e.ip ? ` · ${e.ip}` : ""}
                      </span>
                      <span className={styles.activityTime}>{formatExact(e.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
