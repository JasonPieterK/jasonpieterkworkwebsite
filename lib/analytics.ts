import { supabase } from "./supabase";

export type AnalyticsEvent = {
  kind: "download" | "visit" | "search" | "failed_unlock";
  key?: string;
  device?: string;
  browser?: string;
  os?: string;
  deviceModel?: string;
  screen?: string;
  language?: string;
  userAgent?: string;
  /** Set server-side only (from request headers) — never trust a client-sent IP. */
  ip?: string;
  sessionId?: string;
  country?: string | null;
  city?: string | null;
  referrer?: string;
};

/** Returns the inserted row's id, so a caller can patch duration_seconds onto it later. */
export async function logEvent(event: AnalyticsEvent): Promise<string | null> {
  const { data } = await supabase
    .from("analytics_events")
    .insert({
      kind: event.kind,
      key: event.key?.slice(0, 500) ?? null,
      device: event.device?.slice(0, 40) ?? null,
      browser: event.browser?.slice(0, 40) ?? null,
      os: event.os?.slice(0, 40) ?? null,
      device_model: event.deviceModel?.slice(0, 80) ?? null,
      screen: event.screen?.slice(0, 20) ?? null,
      language: event.language?.slice(0, 20) ?? null,
      user_agent: event.userAgent?.slice(0, 500) ?? null,
      ip: event.ip?.slice(0, 64) ?? null,
      session_id: event.sessionId?.slice(0, 64) ?? null,
      country: event.country?.slice(0, 80) ?? null,
      city: event.city?.slice(0, 80) ?? null,
      referrer: event.referrer?.slice(0, 300) ?? null,
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function logDuration(id: string, durationSeconds: number): Promise<void> {
  if (!id || !Number.isFinite(durationSeconds) || durationSeconds < 0) return;
  await supabase
    .from("analytics_events")
    .update({ duration_seconds: Math.min(Math.round(durationSeconds), 3600) })
    .eq("id", id);
}

export type RawEvent = {
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

export type AnalyticsSummary = {
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
  /** [dayOfWeek 0-6][hour 0-23] = event count. */
  peakHours: number[][];
  avgDurationSeconds: number | null;
  downloadDetails: RawEvent[];
  visitDetails: RawEvent[];
  searchDetails: RawEvent[];
  failedUnlockDetails: RawEvent[];
  /** Most recent sessions, each with its ordered sequence of events. */
  sessions: { sessionId: string; events: RawEvent[] }[];
  timeSeries: { date: string; downloads: number; visits: number }[];
  recentEvents: RawEvent[];
};

export type TimeRange = "1d" | "7d" | "30d" | "all";

function rangeStart(range: TimeRange): string | null {
  if (range === "all") return null;
  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function tally(rows: (string | null | undefined)[]): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of rows) {
    const v = value || "unknown";
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function toRawEvent(e: Record<string, unknown>): RawEvent {
  return {
    id: e.id as string,
    kind: e.kind as string,
    key: (e.key as string) ?? null,
    device: (e.device as string) ?? null,
    browser: (e.browser as string) ?? null,
    os: (e.os as string) ?? null,
    deviceModel: (e.device_model as string) ?? null,
    screen: (e.screen as string) ?? null,
    language: (e.language as string) ?? null,
    userAgent: (e.user_agent as string) ?? null,
    ip: (e.ip as string) ?? null,
    sessionId: (e.session_id as string) ?? null,
    country: (e.country as string) ?? null,
    city: (e.city as string) ?? null,
    referrer: (e.referrer as string) ?? null,
    durationSeconds: (e.duration_seconds as number) ?? null,
    createdAt: e.created_at as string,
  };
}

/** Subject name from a materials path — "!!repo/SUBJECT/SEMESTER/file" -> "SUBJECT". */
function subjectFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[1] ?? parts[0] ?? path;
}

// How many rows of a detail table (downloads/visits/search/failed-unlock) get
// sent to the client. The dashboard only ever shows the most recent slice —
// sending all 5000 possible rows (each with a full user agent string) was
// most of what made the page slow to load.
const DETAIL_ROW_CAP = 300;

export async function getAnalyticsSummary(range: TimeRange = "30d"): Promise<AnalyticsSummary> {
  const since = rangeStart(range);

  let eventsQuery = supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(5000);
  if (since) eventsQuery = eventsQuery.gte("created_at", since);

  // Both previously ran as sequential awaits (three round trips in a row);
  // running them together roughly triples the load speed. download_counts is
  // fetched once and reused for both "top files" (range=all) and the subject
  // rollup, instead of two separate queries against the same table.
  const [{ data }, { data: downloadCounts }] = await Promise.all([
    eventsQuery,
    supabase.from("download_counts").select("key, count").order("count", { ascending: false }),
  ]);

  const eventRows = (data ?? []).map(toRawEvent);
  const downloadEvents = eventRows.filter((e) => e.kind === "download");
  const visitEvents = eventRows.filter((e) => e.kind === "visit");
  const searchEvents = eventRows.filter((e) => e.kind === "search");
  const failedUnlockEvents = eventRows.filter((e) => e.kind === "failed_unlock");

  // Top files reads from the all-time counter table when showing all time —
  // range-scoped "most downloaded" instead tallies the (bounded) download
  // events fetched above, which approximates it for a narrower window.
  const topFiles =
    range === "all"
      ? (downloadCounts ?? []).slice(0, 20).map((r) => ({ key: r.key, count: r.count }))
      : tally(downloadEvents.map((e) => e.key)).slice(0, 20).map((r) => ({ key: r.key, count: r.count }));

  const totalDownloads = range === "all" ? (downloadCounts ?? []).reduce((n, r) => n + r.count, 0) : downloadEvents.length;

  // Subject popularity is a re-bucketing of the same download_counts rows,
  // grouped one level up — no separate query needed.
  const subjectCounts = new Map<string, number>();
  for (const r of downloadCounts ?? []) {
    const subject = subjectFromPath(r.key);
    subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + r.count);
  }
  const subjectPopularity = Array.from(subjectCounts.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);

  // Bucket by calendar day for the graph, and by weekday/hour for the heatmap.
  const dayBuckets = new Map<string, { downloads: number; visits: number }>();
  const peakHours: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const e of eventRows) {
    const day = e.createdAt.slice(0, 10);
    const bucket = dayBuckets.get(day) ?? { downloads: 0, visits: 0 };
    if (e.kind === "download") bucket.downloads += 1;
    else if (e.kind === "visit") bucket.visits += 1;
    dayBuckets.set(day, bucket);

    const d = new Date(e.createdAt);
    peakHours[d.getDay()][d.getHours()] += 1;
  }
  const timeSeries = Array.from(dayBuckets.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Sessions: group every event by session_id, keep the most recently active
  // ones, and flag a session "returning" if its events span more than one
  // calendar day (i.e. seen again on a later visit).
  const bySession = new Map<string, RawEvent[]>();
  for (const e of eventRows) {
    if (!e.sessionId) continue;
    const list = bySession.get(e.sessionId) ?? [];
    list.push(e);
    bySession.set(e.sessionId, list);
  }
  let returningSessions = 0;
  for (const events of bySession.values()) {
    const days = new Set(events.map((e) => e.createdAt.slice(0, 10)));
    if (days.size > 1) returningSessions += 1;
  }
  const sessions = Array.from(bySession.entries())
    .map(([sessionId, events]) => ({
      sessionId,
      events: events.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))
    .sort((a, b) => b.events[b.events.length - 1].createdAt.localeCompare(a.events[a.events.length - 1].createdAt))
    .slice(0, 30);

  const durations = eventRows.map((e) => e.durationSeconds).filter((d): d is number => d !== null && d > 0);
  const avgDurationSeconds = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  return {
    totalDownloads,
    totalVisits: visitEvents.length,
    totalSearches: searchEvents.length,
    totalFailedUnlocks: failedUnlockEvents.length,
    totalSessions: bySession.size,
    returningSessions,
    topFiles,
    deviceBreakdown: tally(eventRows.map((e) => e.device)).map((r) => ({ device: r.key, count: r.count })),
    browserBreakdown: tally(eventRows.map((e) => e.browser)).map((r) => ({ browser: r.key, count: r.count })),
    osBreakdown: tally(eventRows.map((e) => e.os)).map((r) => ({ os: r.key, count: r.count })),
    modelBreakdown: tally(eventRows.map((e) => e.deviceModel)).map((r) => ({ model: r.key, count: r.count })),
    downloadsByDevice: tally(downloadEvents.map((e) => e.device)).map((r) => ({ device: r.key, count: r.count })),
    countryBreakdown: tally(eventRows.map((e) => e.country)).map((r) => ({ country: r.key, count: r.count })),
    referrerBreakdown: tally(visitEvents.map((e) => (e.referrer ? e.referrer : "direct"))).map((r) => ({
      referrer: r.key,
      count: r.count,
    })),
    subjectPopularity,
    searchQueries: tally(searchEvents.map((e) => e.key)).map((r) => ({ query: r.key, count: r.count })),
    peakHours,
    avgDurationSeconds,
    downloadDetails: downloadEvents.slice(0, DETAIL_ROW_CAP),
    visitDetails: visitEvents.slice(0, DETAIL_ROW_CAP),
    searchDetails: searchEvents.slice(0, DETAIL_ROW_CAP),
    failedUnlockDetails: failedUnlockEvents.slice(0, DETAIL_ROW_CAP),
    sessions,
    timeSeries,
    recentEvents: eventRows.slice(0, 100),
  };
}

const CSV_COLUMNS: (keyof RawEvent)[] = [
  "createdAt",
  "kind",
  "key",
  "device",
  "deviceModel",
  "browser",
  "os",
  "screen",
  "language",
  "ip",
  "country",
  "city",
  "referrer",
  "durationSeconds",
  "sessionId",
];

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportEventsCsv(range: TimeRange): Promise<string> {
  const since = rangeStart(range);
  let query = supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(10000);
  if (since) query = query.gte("created_at", since);
  const { data } = await query;
  const rows = (data ?? []).map(toRawEvent);

  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((r) => CSV_COLUMNS.map((c) => csvEscape(r[c])).join(","));
  return [header, ...lines].join("\n");
}
