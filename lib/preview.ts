import type { FileEntry } from "./types";

const OFFICE_EXTS = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"]);
const INLINE_EXTS = new Set(["pdf", "png", "jpg", "jpeg", "gif", "svg", "webp", "txt", "md", "csv"]);

export function getPreviewUrl(file: FileEntry): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (OFFICE_EXTS.has(ext)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(file.downloadUrl)}&embedded=true`;
  }
  if (INLINE_EXTS.has(ext)) return file.downloadUrl;
  return null;
}
