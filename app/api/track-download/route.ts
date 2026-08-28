import { NextRequest, NextResponse } from "next/server";
import { incrementDownload } from "@/lib/downloadCounts";
import { logEvent } from "@/lib/analytics";
import { getRequestIp } from "@/lib/requestIp";
import { lookupGeo } from "@/lib/geoip";

export async function POST(req: NextRequest) {
  try {
    const { key, device, browser, os, deviceModel, screen, language, userAgent, sessionId } = await req.json();
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key required" }, { status: 400 });
    }
    const safeKey = key.slice(0, 500);
    const ip = getRequestIp(req) ?? undefined;
    const geo = await lookupGeo(ip ?? null);
    await Promise.all([
      incrementDownload(safeKey),
      logEvent({
        kind: "download",
        key: safeKey,
        device,
        browser,
        os,
        deviceModel,
        screen,
        language,
        userAgent,
        ip,
        sessionId,
        country: geo.country,
        city: geo.city,
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    // Telemetry — never worth surfacing a hard failure to the download flow.
    return NextResponse.json({ success: false });
  }
}
