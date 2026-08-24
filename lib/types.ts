export type GithubTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
};

export type ChangeKind = "added" | "modified";

export type FileEntry = {
  path: string;
  name: string;
  downloadUrl: string;
  htmlUrl: string;
  lastCommitDate: string;
  lastCommitMessage: string;
  size: number;
  /**
   * Set on every file changed within the recent-commit window, so the
   * New/Updated filters match all of them — not just one per subject.
   */
  badge: "new" | "updated" | null;
};

export type SemesterGroup = {
  semester: string;
  files: FileEntry[];
};

export type Subject = {
  slug: string;
  name: string;
  semesters: SemesterGroup[];
  fileCount: number;
  newestAdded: FileEntry | null;
  newestUpdated: FileEntry | null;
  /**
   * True when the commit lookup failed (rate limit, API error) and dates and
   * badges are therefore missing. The files themselves are still listed.
   */
  metaIncomplete: boolean;
};

export type ChangelogEntry = {
  sha: string;
  shortSha: string;
  date: string;
  /** First line of the commit message, e.g. "Updated CATATAN IPA BAB 2.docx". */
  title: string;
  /** "Added" | "Updated" | "Removed" | "Renamed" | "" — drives the badge colour. */
  action: string;
  /** Context line, e.g. "IPA / SEMESTER 1". */
  scope: string;
  /** Per-file bullet lines from the commit body. */
  changes: { verb: string; path: string; name: string }[];
  htmlUrl: string;
};
