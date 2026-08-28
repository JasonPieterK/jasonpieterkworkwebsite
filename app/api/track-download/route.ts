import { NextRequest, NextResponse } from "next/server";
import { incrementDownload } from "@/lib/downloadCounts";
import { logEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const { key, device, browser, os } = await req.json();
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key required" }, { status: 400 });
    }
    const safeKey = key.slice(0, 500);
    await Promise.all([
      incrementDownload(safeKey),
      logEvent({ kind: "download", key: safeKey, device, browser, os }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    // Telemetry — never worth surfacing a hard failure to the download flow.
    return NextResponse.json({ success: false });
  }
}
