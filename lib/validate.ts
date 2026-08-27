import { BRANCH, PDF_BRANCH, ROOT_PREFIX } from "./repoLinks";

/**
 * Guards for anything that ends up inside a raw.githubusercontent.com URL.
 *
 * fetch() resolves the result with WHATWG URL semantics, which collapses "..",
 * so an unchecked `path` or `sha` walks out of this repo and turns the route
 * into an open proxy for any public file on GitHub.
 */

/** A file inside this repo's materials root, with no traversal tricks. */
export function isSafeRepoPath(path: string): boolean {
  if (!path || path.length > 400) return false;
  if (!path.startsWith(ROOT_PREFIX)) return false;
  if (path.includes("..")) return false;
  if (path.includes("\\") || path.startsWith("/")) return false;
  // Control characters would also let a filename break out of a header value.
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  return true;
}

/** A commit SHA, or the default branch. Nothing else may address content. */
export function isSafeRef(ref: string): boolean {
  return ref === BRANCH || /^[0-9a-f]{7,40}$/i.test(ref);
}

/** Same, but also allows the branch holding prebuilt PDFs. */
export function isSafeRawRef(ref: string): boolean {
  return ref === PDF_BRANCH || isSafeRef(ref);
}

/**
 * A path on the `pdf` branch, which mirrors the materials tree with
 * ROOT_PREFIX stripped, so it cannot be checked against isSafeRepoPath —
 * only against the same traversal/control-character rules.
 */
export function isSafePdfPath(path: string): boolean {
  if (!path || path.length > 400) return false;
  if (path.includes("..")) return false;
  if (path.includes("\\") || path.startsWith("/")) return false;
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  return true;
}

/**
 * A Content-Disposition value that cannot break out of its quoted string and
 * survives non-Latin-1 filenames.
 *
 * Header values are Latin-1; a name containing CJK or emoji makes the response
 * constructor throw, so the quoted form is ASCII-folded and the real name is
 * carried in RFC 5987 `filename*`, which every current browser prefers.
 */
export function contentDisposition(filename: string, type: "attachment" | "inline" = "attachment"): string {
  const ascii = filename
    .replace(/[\u0000-\u001f\u007f-\uffff]/g, "_")
    .replace(/["\\]/g, "_")
    .replace(/;/g, "_")
    .trim() || "download";
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
