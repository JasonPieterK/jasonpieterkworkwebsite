import type { ChangeKind, FileEntry, GithubTreeItem, Subject } from "./types";
import { OWNER, REPO, BRANCH, ROOT_PREFIX } from "./repoLinks";

// Fallback TTL — the GitHub webhook (app/api/revalidate) triggers instant
// revalidation on push, this just bounds staleness if that ever misfires.
const REVALIDATE_SECONDS = 600;
const HIDDEN_FILES = new Set([".gitkeep"]);
// New/Updated badges expire once their commit is more than this many commits behind HEAD (repo-wide).
const BADGE_COMMIT_WINDOW = 3;

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class RateLimitError extends Error {}

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...authHeaders(),
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new RateLimitError(`GitHub API rate limit hit for ${url}`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

type CommitListItem = {
  sha: string;
  commit: { message: string; author: { date: string; name: string } };
};

type CommitDetail = CommitListItem & {
  files?: { filename: string; status: string }[];
};

function toChangeKind(status: string): ChangeKind {
  return status === "added" ? "added" : "modified";
}

async function fetchTree(): Promise<GithubTreeItem[]> {
  const data = await ghFetch<{ tree: GithubTreeItem[]; truncated: boolean }>(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`
  );
  return data.tree.filter((t) => t.path.startsWith(ROOT_PREFIX));
}

type FileCommitInfo = {
  date: string;
  firstDate: string;
  message: string;
  changeKind: ChangeKind;
  commitIndex: number;
};

// Walks commits newest-first, stopping early once every known file path has
// been resolved or the GitHub rate limit is hit — partial results still render.
// First occurrence per file (in newest-first order) is that file's most recent
// action — its own change history further back doesn't matter for "what happened last."
// commitIndex is that commit's distance from HEAD (0 = latest), used to expire badges.
async function fetchLastCommitPerFile(knownPaths: Set<string>): Promise<Map<string, FileCommitInfo>> {
  let commits: CommitListItem[];
  try {
    commits = await ghFetch<CommitListItem[]>(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=100`
    );
  } catch {
    return new Map();
  }

  const map = new Map<string, FileCommitInfo>();
  const BATCH_SIZE = 10; // fetch commit details concurrently in small batches —
  // sequential awaits here made subject pages take 10+s on a cold cache.

  for (let start = 0; start < commits.length; start += BATCH_SIZE) {
    if (map.size >= knownPaths.size) break;
    const batch = commits.slice(start, start + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((c) => ghFetch<CommitDetail>(`https://api.github.com/repos/${OWNER}/${REPO}/commits/${c.sha}`))
    );

    let hitRateLimit = false;
    results.forEach((result, j) => {
      const i = start + j;
      if (result.status === "rejected") {
        if (result.reason instanceof RateLimitError) hitRateLimit = true;
        return; // one bad commit lookup shouldn't take down the whole page
      }
      const detail = result.value;
      const date = detail.commit.author.date;
      const message = detail.commit.message.split("\n")[0];
      for (const f of detail.files ?? []) {
        const existing = map.get(f.filename);
        if (!existing) {
          map.set(f.filename, {
            date,
            firstDate: date,
            message,
            changeKind: toChangeKind(f.status),
            commitIndex: i,
          });
        } else {
          existing.firstDate = date; // this commit is older (walked newest-first)
        }
      }
    });
    if (hitRateLimit) break;
  }

  return map;
}

function subjectSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export async function getSubjects(): Promise<Subject[]> {
  let tree: GithubTreeItem[];
  try {
    tree = await fetchTree();
  } catch (err) {
    console.error("Failed to load repo tree", err);
    return [];
  }
  const blobPaths = new Set(tree.filter((t) => t.type === "blob").map((t) => t.path));
  const commitMap = await fetchLastCommitPerFile(blobPaths);

  const subjectMap = new Map<string, Subject>();

  function getSubjectEntry(subjectName: string): Subject {
    const slug = subjectSlug(subjectName);
    if (!subjectMap.has(slug)) {
      subjectMap.set(slug, {
        slug,
        name: subjectName,
        semesters: [],
        fileCount: 0,
        newestAdded: null,
        newestUpdated: null,
      });
    }
    return subjectMap.get(slug)!;
  }

  function getSemesterGroup(subject: Subject, semesterName: string) {
    let group = subject.semesters.find((s) => s.semester === semesterName);
    if (!group) {
      group = { semester: semesterName, files: [] };
      subject.semesters.push(group);
    }
    return group;
  }

  // First pass: register every subject/semester folder so empty ones still show up.
  for (const item of tree) {
    if (item.type !== "tree") continue;
    const relative = item.path.slice(ROOT_PREFIX.length);
    const parts = relative.split("/").filter(Boolean);
    if (parts.length === 0 || parts.length > 2) continue;

    const [subjectName, semesterName] = parts;
    const subject = getSubjectEntry(subjectName);
    if (parts.length === 2) {
      getSemesterGroup(subject, semesterName);
    }
  }

  // Second pass: attach visible files.
  for (const item of tree) {
    if (item.type !== "blob") continue;
    const relative = item.path.slice(ROOT_PREFIX.length);
    const parts = relative.split("/");
    if (parts.length < 3) continue; // expect SUBJECT/SEMESTER X/file...

    const fileName = parts[parts.length - 1];
    if (HIDDEN_FILES.has(fileName)) continue;

    const [subjectName, semesterName] = parts;
    const subject = getSubjectEntry(subjectName);

    const commitInfo = commitMap.get(item.path);
    const lastCommitDate = commitInfo?.date ?? "";

    const entry: FileEntry = {
      path: item.path,
      name: fileName,
      downloadUrl: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encodeURI(item.path)}`,
      htmlUrl: `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${encodeURI(item.path)}`,
      lastCommitDate,
      firstCommitDate: commitInfo?.firstDate ?? lastCommitDate,
      lastCommitMessage: commitInfo?.message ?? "",
      changeKind: commitInfo?.changeKind ?? "modified",
    };

    const semGroup = getSemesterGroup(subject, semesterName);
    semGroup.files.push(entry);
    subject.fileCount += 1;

    const withinBadgeWindow = Boolean(commitInfo && commitInfo.commitIndex < BADGE_COMMIT_WINDOW);
    if (lastCommitDate && withinBadgeWindow) {
      const slot = entry.changeKind === "added" ? "newestAdded" : "newestUpdated";
      if (!subject[slot] || lastCommitDate > subject[slot]!.lastCommitDate) {
        subject[slot] = entry;
      }
    }
  }

  const subjects = Array.from(subjectMap.values());
  for (const s of subjects) {
    s.semesters.sort((a, b) => a.semester.localeCompare(b.semester));
    for (const g of s.semesters) {
      g.files.sort((a, b) => b.lastCommitDate.localeCompare(a.lastCommitDate));
    }
  }
  subjects.sort((a, b) => a.name.localeCompare(b.name));
  return subjects;
}

export async function getSubject(slug: string): Promise<Subject | undefined> {
  const subjects = await getSubjects();
  return subjects.find((s) => s.slug === slug);
}
