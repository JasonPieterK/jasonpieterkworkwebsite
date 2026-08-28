import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/analytics";
import { getRequestIp } from "@/lib/requestIp";
import { lookupGeo } from "@/lib/geoip";

export async function POST(req: NextRequest) {
  try {
    const { path, device, browser, os, deviceModel, screen, language, userAgent, sessionId, referrer } =
      await req.json();
    const ip = getRequestIp(req) ?? undefined;
    const geo = await lookupGeo(ip ?? null);
    const id = await logEvent({
      kind: "visit",
      key: typeof path === "string" ? path.slice(0, 300) : undefined,
      device,
      browser,
      os,
      deviceModel,
      screen,
      language,
      userAgent,
      ip,
      sessionId,
      referrer,
      country: geo.country,
      city: geo.city,
    });
    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ success: false });
  }
}
