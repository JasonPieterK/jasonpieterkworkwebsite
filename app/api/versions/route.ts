import { NextRequest, NextResponse } from "next/server";
import { OWNER, REPO, BRANCH } from "@/lib/repoLinks";

export const revalidate = 600;

type CommitListItem = {
  sha: string;
  commit: { message: string; author: { date: string } };
};

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${encodeURIComponent(path)}&sha=${BRANCH}&per_page=30`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 600 },
    }
  );
  if (!res.ok) return NextResponse.json({ error: "GitHub API error" }, { status: res.status });

  const commits = (await res.json()) as CommitListItem[];
  const versions = commits.map((c) => ({
    sha: c.sha,
    date: c.commit.author.date,
    message: c.commit.message.split("\n")[0],
  }));
  return NextResponse.json(versions);
}
