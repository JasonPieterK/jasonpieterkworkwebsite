import { NextRequest, NextResponse } from "next/server";
import { logDuration } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const { id, durationSeconds } = await req.json();
    if (typeof id !== "string" || typeof durationSeconds !== "number") {
      return NextResponse.json({ error: "id and durationSeconds required" }, { status: 400 });
    }
    await logDuration(id, durationSeconds);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
