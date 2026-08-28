import { NextRequest, NextResponse } from "next/server";
import { readFileFlags } from "@/lib/fileFlags";
import { verifyPasscode } from "@/lib/passcodes";
import { logEvent } from "@/lib/analytics";
import { getRequestIp } from "@/lib/requestIp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: filePath, password, device, browser, os, deviceModel, sessionId } = body;

    if (!filePath || !password) {
      return NextResponse.json({ error: "path and password required" }, { status: 400 });
    }

    const flags = await readFileFlags();
    if (!flags[filePath]?.locked) {
      return NextResponse.json({ error: "File not locked" }, { status: 400 });
    }

    const valid = await verifyPasscode(password);
    if (!valid) {
      // Serverless functions can terminate right after the response is sent,
      // so this has to be awaited rather than fired-and-forgotten.
      await logEvent({
        kind: "failed_unlock",
        key: filePath,
        device,
        browser,
        os,
        deviceModel,
        sessionId,
        ip: getRequestIp(req) ?? undefined,
      }).catch(() => {});
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
