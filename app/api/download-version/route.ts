import { NextRequest, NextResponse } from "next/server";
import { OWNER, REPO } from "@/lib/repoLinks";
import { githubAuthHeaders } from "@/lib/githubAuth";
import { contentDisposition, isSafeRef, isSafeRepoPath } from "@/lib/validate";

export const revalidate = 3600;

// Nothing here should ever be near this; it stops a hostile path from
// buffering something huge into a serverless function.
const MAX_BYTES = 60 * 1024 * 1024;

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

  // Both land inside a raw.githubusercontent.com URL, where ".." would walk
  // out of this repo and serve any public file through this domain.
  if (!isSafeRepoPath(path) || !isSafeRef(sha)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${encodeURI(path)}`, {
    headers: githubAuthHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: res.status });

  const declared = Number(res.headers.get("content-length")) || 0;
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const originalName = path.split("/").pop() ?? "file";
  const dotIndex = originalName.lastIndexOf(".");
  const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const ext = dotIndex > 0 ? originalName.slice(dotIndex) : "";
  // Only the date part is used, so a crafted `date` cannot reach the header.
  const dateStr = /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : sha.slice(0, 7);
  const messageSlug = message ? `-${slugify(message)}` : "";
  const filename = `${base}_${dateStr}${messageSlug}${ext}`;

  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": contentDisposition(filename),
      // Lets the client render a determinate download progress bar.
      "Content-Length": String(body.byteLength),
      "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
