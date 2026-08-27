import { NextRequest, NextResponse } from "next/server";
import { readFileFlags } from "@/lib/fileFlags";

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const flags = await readFileFlags();
  return NextResponse.json({ isLocked: Boolean(flags[filePath]?.locked) });
}
