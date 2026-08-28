import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/analytics";
import { getRequestIp } from "@/lib/requestIp";

export async function POST(req: NextRequest) {
  try {
    const { query, device, browser, os, deviceModel, sessionId } = await req.json();
    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }
    await logEvent({
      kind: "search",
      key: query.slice(0, 200),
      device,
      browser,
      os,
      deviceModel,
      sessionId,
      ip: getRequestIp(req) ?? undefined,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
