import type { FileEntry, Subject } from "./types";
import { rawUrlFor, blobUrlFor } from "./repoLinks";

/**
 * Slim, serialisable index shared by the command palette and the starred rail.
 *
 * Passing the full Subject[] embedded two GitHub URLs (~150 bytes each) plus
 * fields nobody reads into the RSC payload of every page. Both URLs are
 * derivable from the path, so they are rebuilt on the client instead.
 */
export type IndexedFile = {
  path: string;
  name: string;
  subject: string;
  slug: string;
  semester: string;
  size: number;
  date: string;
  message: string;
};

export type SearchIndex = {
  subjects: { name: string; slug: string; fileCount: number }[];
  files: IndexedFile[];
};

export function buildSearchIndex(subjects: Subject[]): SearchIndex {
  const files: IndexedFile[] = [];
  for (const subject of subjects) {
    for (const group of subject.semesters) {
      for (const file of group.files) {
        files.push({
          path: file.path,
          name: file.name,
          subject: subject.name,
          slug: subject.slug,
          semester: group.semester,
          size: file.size,
          date: file.lastCommitDate,
          message: file.lastCommitMessage,
        });
      }
    }
  }
  return {
    subjects: subjects.map((s) => ({ name: s.name, slug: s.slug, fileCount: s.fileCount })),
    files,
  };
}

/** Rebuild the shape FileCard/DownloadModal expect from an indexed file. */
export function toFileEntry(item: IndexedFile): FileEntry {
  return {
    path: item.path,
    name: item.name,
    downloadUrl: rawUrlFor(item.path),
    htmlUrl: blobUrlFor(item.path),
    lastCommitDate: item.date,
    lastCommitMessage: item.message,
    size: item.size,
    badge: null, // the rail shows starred files, not recency
  };
}
