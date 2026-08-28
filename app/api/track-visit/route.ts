import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/analytics";
import { getRequestIp } from "@/lib/requestIp";

export async function POST(req: NextRequest) {
  try {
    const { path, device, browser, os, deviceModel, screen, language, userAgent } = await req.json();
    await logEvent({
      kind: "visit",
      key: typeof path === "string" ? path.slice(0, 300) : undefined,
      device,
      browser,
      os,
      deviceModel,
      screen,
      language,
      userAgent,
      ip: getRequestIp(req) ?? undefined,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
