export type GeoInfo = { country: string | null; city: string | null };

// Cheap in-memory cache for the life of the serverless instance — classroom
// traffic reuses the same handful of home/school IPs constantly, so this
// alone avoids most repeat lookups without needing a real cache layer.
const cache = new Map<string, GeoInfo>();

const EMPTY: GeoInfo = { country: null, city: null };

/** Best-effort IP → country/city. Never throws, never blocks longer than 1.5s. */
export async function lookupGeo(ip: string | null): Promise<GeoInfo> {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return EMPTY;
  }
  const cached = cache.get(ip);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return EMPTY;
    const data = await res.json();
    if (!data.success) return EMPTY;
    const geo: GeoInfo = { country: data.country ?? null, city: data.city ?? null };
    cache.set(ip, geo);
    return geo;
  } catch {
    return EMPTY;
  }
}
