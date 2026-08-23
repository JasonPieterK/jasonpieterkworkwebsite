import type { FileEntry } from "./types";

const OFFICE_EXTS = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp"]);
const FRAME_EXTS = new Set(["pdf", "txt", "md", "csv"]);

export function getPreviewUrlForRaw(name: string, rawUrl: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (OFFICE_EXTS.has(ext)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  }
  if (IMAGE_EXTS.has(ext) || FRAME_EXTS.has(ext)) return rawUrl;
  return null;
}

export function getPreviewUrl(file: FileEntry): string | null {
  return getPreviewUrlForRaw(file.name, file.downloadUrl);
}

export type InlinePreview = { kind: "image" | "frame"; url: string };

/**
 * Preview that renders inside the page. Own files go through /api/preview so
 * they arrive with a real mime type (raw.githubusercontent sends octet-stream
 * + nosniff, which browsers refuse to render); Office formats fall back to
 * Google's viewer, which needs the public raw URL.
 */
export function getInlinePreview(name: string, path: string, rawUrl: string, sha?: string): InlinePreview | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const proxied = `/api/preview?path=${encodeURIComponent(path)}${sha ? `&sha=${sha}` : ""}`;

  if (IMAGE_EXTS.has(ext)) return { kind: "image", url: proxied };
  if (FRAME_EXTS.has(ext)) return { kind: "frame", url: proxied };
  if (OFFICE_EXTS.has(ext)) {
    return {
      kind: "frame",
      url: `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`,
    };
  }
  return null;
}
