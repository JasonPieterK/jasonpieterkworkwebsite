import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { verifyPassword } from "@/lib/passwordHash";

const DATA_FILE = path.join(process.cwd(), "data", "locked-files.json");

async function getLockedFiles() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: filePath, password } = body;

    if (!filePath || !password) {
      return NextResponse.json(
        { error: "path and password required" },
        { status: 400 }
      );
    }

    const locked = await getLockedFiles();
    const fileData = locked[filePath];

    if (!fileData?.locked) {
      return NextResponse.json(
        { error: "File not locked" },
        { status: 400 }
      );
    }

    const isValid = verifyPassword(password, fileData.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
