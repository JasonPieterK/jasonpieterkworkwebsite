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
  firstCommitDate: string;
  lastCommitMessage: string;
  changeKind: ChangeKind;
  size: number;
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
};
