import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { hashPassword } from "@/lib/passwordHash";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const DATA_FILE = path.join(process.cwd(), "data", "locked-files.json");

async function getLockedFiles() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveLockedFiles(data: Record<string, any>) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token) return false;
  return token === ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, path: filePath, password } = body;

    const locked = await getLockedFiles();

    if (action === "lock") {
      if (!filePath || !password) {
        return NextResponse.json(
          { error: "path and password required" },
          { status: 400 }
        );
      }
      locked[filePath] = { password: hashPassword(password), locked: true };
      await saveLockedFiles(locked);
      return NextResponse.json({ success: true });
    } else if (action === "unlock") {
      if (!filePath) {
        return NextResponse.json({ error: "path required" }, { status: 400 });
      }
      delete locked[filePath];
      await saveLockedFiles(locked);
      return NextResponse.json({ success: true });
    } else if (action === "checkLock") {
      return NextResponse.json({
        isLocked: Boolean(locked[filePath]?.locked),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action");
  const filePath = req.nextUrl.searchParams.get("path");

  if (action === "checkLock" && filePath) {
    const locked = await getLockedFiles();
    return NextResponse.json({
      isLocked: Boolean(locked[filePath]?.locked),
    });
  }

  if (action === "list") {
    const locked = await getLockedFiles();
    return NextResponse.json(locked);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
