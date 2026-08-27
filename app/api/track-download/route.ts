import { NextRequest, NextResponse } from "next/server";
import { incrementDownload } from "@/lib/downloadCounts";

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key required" }, { status: 400 });
    }
    await incrementDownload(key.slice(0, 500));
    return NextResponse.json({ success: true });
  } catch {
    // Telemetry — never worth surfacing a hard failure to the download flow.
    return NextResponse.json({ success: false });
  }
}
