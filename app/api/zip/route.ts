import { NextRequest, NextResponse } from "next/server";
import { getSubject } from "@/lib/github";
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
  if (files.length === 0) return NextResponse.json({ error: "nothing to zip" }, { status: 404 });

  const declared = files.reduce((n, f) => n + f.size, 0);
  if (declared > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "folder too large to zip" }, { status: 413 });
  }

  const results = await Promise.all(
    files.map(async (f) => {
      // no-store: raw files routinely exceed the 2MB data-cache limit, and
      // trying to cache them just logs errors for every large file.
      const res = await fetch(f.downloadUrl, { cache: "no-store" });
      if (!res.ok) return null; // one missing file shouldn't kill the whole archive
      const entry: ZipEntry = {
        name: semester ? f.name : `${f.semester}/${f.name}`,
        data: new Uint8Array(await res.arrayBuffer()),
        date: f.lastCommitDate ? new Date(f.lastCommitDate) : undefined,
      };
      return entry;
    })
  );

  const entries = results.filter((e) => e !== null);
  if (entries.length === 0) return NextResponse.json({ error: "no files could be fetched" }, { status: 502 });

  const zip = createZip(entries);
  const label = semester ? `${subject.name} - ${semester}` : subject.name;
  const filename = `${label.replace(/[^\w\s.-]+/g, "").trim() || "materials"}.zip`;

  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.byteLength),
    },
  });
}
