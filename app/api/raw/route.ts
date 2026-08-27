import { NextRequest, NextResponse } from "next/server";
import { OWNER, REPO, BRANCH, PDF_BRANCH } from "@/lib/repoLinks";
import { githubAuthHeaders } from "@/lib/githubAuth";
import { isSafePdfPath, isSafeRawRef, isSafeRepoPath } from "@/lib/validate";

export const revalidate = 3600;

// The repo is private — the browser can't hit raw.githubusercontent.com
// itself, and it must never see GITHUB_TOKEN. This streams the same bytes
// through our own server, which attaches the token, so every client-side
// fetch (docx preview, print-to-PDF, plain downloads, Google's viewer) keeps
// working without exposing anything.
const MAX_BYTES = 60 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  const sha = req.nextUrl.searchParams.get("sha") || BRANCH;
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  if (!isSafeRawRef(sha)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const pathOk = sha === PDF_BRANCH ? isSafePdfPath(path) : isSafeRepoPath(path);
  if (!pathOk) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${encodeURI(path)}`, {
    headers: githubAuthHeaders(),
    next: { revalidate },
  });
  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: res.status });

  const declared = Number(res.headers.get("content-length")) || 0;
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
