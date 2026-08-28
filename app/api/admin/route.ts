import { NextRequest, NextResponse } from "next/server";
import { getSubjects } from "@/lib/github";
import { readFileFlags, setFlag } from "@/lib/fileFlags";
import { addPasscode, listPasscodes, removePasscode } from "@/lib/passcodes";
import { readDownloadCounts } from "@/lib/downloadCounts";
import { getAnalyticsSummary, type TimeRange } from "@/lib/analytics";

const VALID_RANGES: TimeRange[] = ["1d", "7d", "30d", "all"];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const CODE_RE = /^\d{6}$/;

function checkAuth(req: NextRequest): boolean {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return Boolean(token) && token === ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = req.nextUrl.searchParams.get("action");

  if (action === "subjects") {
    const [subjects, flags, downloadCounts] = await Promise.all([
      getSubjects({ includeHidden: true }),
      readFileFlags(),
      readDownloadCounts(),
    ]);
    return NextResponse.json({ subjects, flags, downloadCounts });
  }

  if (action === "passcodes") {
    return NextResponse.json({ codes: await listPasscodes() });
  }

  if (action === "analytics") {
    const rangeParam = req.nextUrl.searchParams.get("range") ?? "30d";
    const range = VALID_RANGES.includes(rangeParam as TimeRange) ? (rangeParam as TimeRange) : "30d";
    return NextResponse.json(await getAnalyticsSummary(range));
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "toggleHide" || action === "toggleLock") {
      const { path: filePath, value } = body;
      if (!filePath || typeof value !== "boolean") {
        return NextResponse.json({ error: "path and value required" }, { status: 400 });
      }
      const key = action === "toggleHide" ? "hidden" : "locked";
      const flags = await setFlag(filePath, key, value);
      return NextResponse.json({ success: true, flags });
    }

    if (action === "addPasscode") {
      const { code, label } = body;
      if (!CODE_RE.test(code)) {
        return NextResponse.json({ error: "Code must be exactly 6 digits" }, { status: 400 });
      }
      const codes = await addPasscode(code, label || "");
      return NextResponse.json({ success: true, codes });
    }

    if (action === "removePasscode") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const codes = await removePasscode(id);
      return NextResponse.json({ success: true, codes });
    }

    if (action === "login") {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
