import type { FileEntry } from "./types";

export type SortKey = "newest" | "oldest" | "name" | "nameDesc" | "largest";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Name A–Z" },
  { key: "nameDesc", label: "Name Z–A" },
  { key: "largest", label: "Largest first" },
];

/** `numeric` collation so "BAB 2" sorts before "BAB 10". */
export function compareFiles(a: FileEntry, b: FileEntry, sort: SortKey): number {
  switch (sort) {
    case "oldest":
      return a.lastCommitDate.localeCompare(b.lastCommitDate);
    case "name":
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    case "nameDesc":
      return b.name.localeCompare(a.name, undefined, { numeric: true });
    case "largest":
      return b.size - a.size;
    default:
      return b.lastCommitDate.localeCompare(a.lastCommitDate);
  }
}

export function sortFiles(files: FileEntry[], sort: SortKey): FileEntry[] {
  return [...files].sort((a, b) => compareFiles(a, b, sort));
}
