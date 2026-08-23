import { NextRequest, NextResponse } from "next/server";
import { OWNER, REPO } from "@/lib/repoLinks";

export const revalidate = 3600;

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  const sha = req.nextUrl.searchParams.get("sha");
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const message = req.nextUrl.searchParams.get("message") ?? "";
  if (!path || !sha) return NextResponse.json({ error: "path and sha required" }, { status: 400 });

  const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${path}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: res.status });

  const originalName = path.split("/").pop() ?? "file";
  const dotIndex = originalName.lastIndexOf(".");
  const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const ext = dotIndex > 0 ? originalName.slice(dotIndex) : "";
  const dateStr = date ? date.slice(0, 10) : sha.slice(0, 7);
  const messageSlug = message ? `-${slugify(message)}` : "";
  const filename = `${base}_${dateStr}${messageSlug}${ext}`;

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Lets the client render a determinate download progress bar.
      "Content-Length": String(body.byteLength),
      "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
    },
  });
}
