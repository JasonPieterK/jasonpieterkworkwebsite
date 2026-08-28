import { supabase } from "./supabase";

export type AnalyticsEvent = {
  kind: "download" | "visit";
  key?: string;
  device?: string;
  browser?: string;
  os?: string;
};

export async function logEvent(event: AnalyticsEvent): Promise<void> {
  await supabase.from("analytics_events").insert({
    kind: event.kind,
    key: event.key?.slice(0, 500) ?? null,
    device: event.device?.slice(0, 40) ?? null,
    browser: event.browser?.slice(0, 40) ?? null,
    os: event.os?.slice(0, 40) ?? null,
  });
}

export type AnalyticsSummary = {
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

function tally(rows: { [key: string]: string | null }[], field: string): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[field] || "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [downloadCounts, events] = await Promise.all([
    supabase.from("download_counts").select("key, count").order("count", { ascending: false }).limit(20),
    // Most recent 2000 events is plenty for a classroom-scale site and keeps
    // the aggregation client-side simple — no need for a second SQL round trip.
    supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(2000),
  ]);

  const eventRows = events.data ?? [];
  const downloadEvents = eventRows.filter((e) => e.kind === "download");
  const visitEvents = eventRows.filter((e) => e.kind === "visit");

  const totalDownloads = (downloadCounts.data ?? []).reduce((n, r) => n + r.count, 0);

  return {
    totalDownloads,
    totalVisits: visitEvents.length,
    topFiles: (downloadCounts.data ?? []).map((r) => ({ key: r.key, count: r.count })),
    deviceBreakdown: tally(eventRows, "device").map((r) => ({ device: r.key, count: r.count })),
    browserBreakdown: tally(eventRows, "browser").map((r) => ({ browser: r.key, count: r.count })),
    osBreakdown: tally(eventRows, "os").map((r) => ({ os: r.key, count: r.count })),
    downloadsByDevice: tally(downloadEvents, "device").map((r) => ({ device: r.key, count: r.count })),
    recentEvents: eventRows.slice(0, 50).map((e) => ({
      kind: e.kind,
      key: e.key,
      device: e.device,
      browser: e.browser,
      os: e.os,
      createdAt: e.created_at,
    })),
  };
}
