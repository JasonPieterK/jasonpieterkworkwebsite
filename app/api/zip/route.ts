import { NextRequest, NextResponse } from "next/server";
import { getSubject } from "@/lib/github";
import { ROOT_PREFIX } from "@/lib/repoLinks";
import { githubAuthHeaders } from "@/lib/githubAuth";
import { createZip, type ZipEntry } from "@/lib/zip";

export const revalidate = 600;

// Guard against zipping an unexpectedly huge folder into memory.
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("subject");
  const semester = req.nextUrl.searchParams.get("semester");
  if (!slug) return NextResponse.json({ error: "subject required" }, { status: 400 });

  const subject = await getSubject(slug);
  if (!subject) return NextResponse.json({ error: "subject not found" }, { status: 404 });

  const groups = semester ? subject.semesters.filter((g) => g.semester === semester) : subject.semesters;
  const files = groups.flatMap((g) => g.files.map((f) => ({ ...f, semester: g.semester })));

  /**
   * Entry name from the file's real position in the repo, not its basename.
   * Two files in different subfolders of one semester share a basename, and a
   * flat name makes them overwrite each other silently on extraction.
   */
  const entryName = (f: (typeof files)[number]) => {
    const rel = f.path.startsWith(ROOT_PREFIX) ? f.path.slice(ROOT_PREFIX.length) : f.path;
    const parts = rel.split("/").filter(Boolean);
    // rel is SUBJECT/SEMESTER/.../file — drop the subject, and the semester
    // too when the archive is already scoped to one.
    return parts.slice(semester ? 2 : 1).join("/") || f.name;
  };
  if (files.length === 0) return NextResponse.json({ error: "nothing to zip" }, { status: 404 });

  const declared = files.reduce((n, f) => n + f.size, 0);
  if (declared > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "folder too large to zip" }, { status: 413 });
  }

  // A 60-file subject used to open 60 sockets at once from a single serverless
  // invocation, with every body resident in memory simultaneously.
  const CONCURRENCY = 6;

  async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out = new Array<R>(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
  }

  const results = await mapWithLimit(files, CONCURRENCY, async (f) => {
      // no-store: raw files routinely exceed the 2MB data-cache limit, and
      // trying to cache them just logs errors for every large file.
      const res = await fetch(f.downloadUrl, { cache: "no-store", headers: githubAuthHeaders() });
      if (!res.ok) return null; // one missing file shouldn't kill the whole archive
      const entry: ZipEntry = {
        name: entryName(f),
        data: new Uint8Array(await res.arrayBuffer()),
        date: f.lastCommitDate ? new Date(f.lastCommitDate) : undefined,
      };
      return entry;
  });

  const entries = results.filter((e) => e !== null);
  if (entries.length === 0) return NextResponse.json({ error: "no files could be fetched" }, { status: 502 });
  const missing = files.length - entries.length;

  const zip = createZip(entries);
  const label = semester ? `${subject.name} - ${semester}` : subject.name;
  const filename = `${label.replace(/[^\w\s.-]+/g, "").trim() || "materials"}.zip`;

  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.byteLength),
      // Surfaced so a partial archive is at least detectable rather than
      // silently short a file.
      ...(missing > 0 ? { "X-Zip-Missing-Files": String(missing) } : {}),
    },
  });
}
