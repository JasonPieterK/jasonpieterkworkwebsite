import type { NextRequest } from "next/server";

/**
 * Vercel (and most proxies) put the real client IP first in x-forwarded-for;
 * everything after it is proxies the request passed through. req.ip doesn't
 * exist on the Web-standard NextRequest, so the header is the only source.
 */
export function getRequestIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
