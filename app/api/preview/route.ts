import { NextRequest, NextResponse } from "next/server";
import { OWNER, REPO, BRANCH, ROOT_PREFIX } from "@/lib/repoLinks";

export const revalidate = 3600;

// raw.githubusercontent serves everything as octet-stream + nosniff, so a
// browser downloads instead of rendering it. This proxy re-labels the bytes
// with a real mime type and Content-Disposition: inline, which is what makes
// the in-page preview (iframe / img) work at all.
const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  csv: "text/plain; charset=utf-8",
};

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  const sha = req.nextUrl.searchParams.get("sha") || BRANCH;
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  // Only ever serve files from this repo's materials root.
  if (!path.startsWith(ROOT_PREFIX) || path.includes("..")) {
    return NextResponse.json({ error: "forbidden path" }, { status: 403 });
  }

  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) return NextResponse.json({ error: "not previewable" }, { status: 415 });

  const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${encodeURI(path)}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: res.status });

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": "inline",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
