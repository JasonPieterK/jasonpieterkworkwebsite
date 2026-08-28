import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const { path, device, browser, os } = await req.json();
    await logEvent({ kind: "visit", key: typeof path === "string" ? path.slice(0, 300) : undefined, device, browser, os });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
