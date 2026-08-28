import { supabase } from "./supabase";

export type AnalyticsEvent = {
  kind: "download" | "visit";
  key?: string;
  device?: string;
  browser?: string;
  os?: string;
  deviceModel?: string;
  screen?: string;
  language?: string;
  userAgent?: string;
};

export async function logEvent(event: AnalyticsEvent): Promise<void> {
  await supabase.from("analytics_events").insert({
    kind: event.kind,
    key: event.key?.slice(0, 500) ?? null,
    device: event.device?.slice(0, 40) ?? null,
    browser: event.browser?.slice(0, 40) ?? null,
    os: event.os?.slice(0, 40) ?? null,
    device_model: event.deviceModel?.slice(0, 80) ?? null,
    screen: event.screen?.slice(0, 20) ?? null,
    language: event.language?.slice(0, 20) ?? null,
    user_agent: event.userAgent?.slice(0, 500) ?? null,
  });
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
  createdAt: string;
};

export type AnalyticsSummary = {
  totalDownloads: number;
  totalVisits: number;
  topFiles: { key: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  osBreakdown: { os: string; count: number }[];
  modelBreakdown: { model: string; count: number }[];
  downloadsByDevice: { device: string; count: number }[];
  /** Every download in range, most detailed view — which device got which file, when. */
  downloadDetails: RawEvent[];
  /** One point per day in range: { date: "2026-08-27", downloads, visits }. */
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

function tally(rows: (string | null)[]): { key: string; count: number }[] {
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
    createdAt: e.created_at as string,
  };
}

export async function getAnalyticsSummary(range: TimeRange = "30d"): Promise<AnalyticsSummary> {
  const since = rangeStart(range);

  let query = supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(5000);
  if (since) query = query.gte("created_at", since);
  const { data } = await query;

  const eventRows = (data ?? []).map(toRawEvent);
  const downloadEvents = eventRows.filter((e) => e.kind === "download");
  const visitEvents = eventRows.filter((e) => e.kind === "visit");

  // Top files still reads from the all-time counter table — range-scoped
  // "most downloaded" would need a group-by-key aggregate, which download
  // events (bounded to 5000 rows) approximate below via downloadEvents when
  // a range narrower than "all" is selected.
  const { data: downloadCounts } = await supabase
    .from("download_counts")
    .select("key, count")
    .order("count", { ascending: false })
    .limit(20);

  const topFiles =
    range === "all"
      ? (downloadCounts ?? []).map((r) => ({ key: r.key, count: r.count }))
      : tally(downloadEvents.map((e) => e.key)).slice(0, 20).map((r) => ({ key: r.key, count: r.count }));

  const totalDownloads = range === "all" ? (downloadCounts ?? []).reduce((n, r) => n + r.count, 0) : downloadEvents.length;

  // Bucket by calendar day for the graph.
  const dayBuckets = new Map<string, { downloads: number; visits: number }>();
  for (const e of eventRows) {
    const day = e.createdAt.slice(0, 10);
    const bucket = dayBuckets.get(day) ?? { downloads: 0, visits: 0 };
    if (e.kind === "download") bucket.downloads += 1;
    else bucket.visits += 1;
    dayBuckets.set(day, bucket);
  }
  const timeSeries = Array.from(dayBuckets.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalDownloads,
    totalVisits: visitEvents.length,
    topFiles,
    deviceBreakdown: tally(eventRows.map((e) => e.device)).map((r) => ({ device: r.key, count: r.count })),
    browserBreakdown: tally(eventRows.map((e) => e.browser)).map((r) => ({ browser: r.key, count: r.count })),
    osBreakdown: tally(eventRows.map((e) => e.os)).map((r) => ({ os: r.key, count: r.count })),
    modelBreakdown: tally(eventRows.map((e) => e.deviceModel)).map((r) => ({ model: r.key, count: r.count })),
    downloadsByDevice: tally(downloadEvents.map((e) => e.device)).map((r) => ({ device: r.key, count: r.count })),
    downloadDetails: downloadEvents,
    timeSeries,
    recentEvents: eventRows.slice(0, 100),
  };
}
