export const OWNER = "JasonPieterK";
export const REPO = "jasonpieterkwork";
export const BRANCH = "main";
export const ROOT_PREFIX = "!!jasonpieterkwork/";

export function githubTreeUrl(subjectName: string, semester?: string): string {
  const path = semester ? `${subjectName}/${semester}` : subjectName;
  return `https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/${encodeURI(ROOT_PREFIX + path)}`;
}

export function rawUrlFor(path: string, ref: string = BRANCH): string {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${encodeURI(path)}`;
}

export function blobUrlFor(path: string, ref: string = BRANCH): string {
  return `https://github.com/${OWNER}/${REPO}/blob/${ref}/${encodeURI(path)}`;
}

/** Branch holding the LibreOffice-built PDFs (see the repo's build-pdfs workflow). */
export const PDF_BRANCH = "pdf";

/**
 * Where the prebuilt PDF for a document lives, or null if the file is not a
 * Word document. Mirrors the materials tree with the root prefix stripped.
 */
export function prebuiltPdfUrlFor(path: string): string | null {
  if (!/\.docx?$/i.test(path)) return null;
  const rel = path.startsWith(ROOT_PREFIX) ? path.slice(ROOT_PREFIX.length) : path;
  const asPdf = rel.replace(/\.docx?$/i, ".pdf");
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${PDF_BRANCH}/${encodeURI(asPdf)}`;
}
