export type GithubTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
};

export type FileEntry = {
  path: string;
  name: string;
  downloadUrl: string;
  htmlUrl: string;
  lastCommitDate: string;
  lastCommitMessage: string;
  isNew: boolean;
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
  newCount: number;
};
