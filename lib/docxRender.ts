/**
 * Word-faithful .docx rendering, in the browser.
 *
 * docx-preview reproduces the document's own layout — page size and margins
 * from the section properties, paragraph alignment and indentation, fonts,
 * colours, table borders, and real page breaks. That is what makes the preview
 * legible on a phone and the printed PDF match what Word shows.
 *
 * (The previous implementation used mammoth, which by design throws away
 * direct formatting and emits only semantic HTML — hence the crooked output.)
 *
 * The library is imported dynamically, so none of it ships until someone
 * actually opens a preview or asks for a PDF.
 */

export type RenderStage = "fetching" | "rendering" | "opening";

const RENDER_OPTIONS = {
  className: "docx",
  inWrapper: true,
  breakPages: true,
  renderHeaders: true,
  renderFooters: true,
  renderFootnotes: true,
  renderEndnotes: true,
  ignoreWidth: false,
  ignoreHeight: false,
  useBase64URL: true, // inline images, so a print window has nothing to wait on
};

/**
 * A .docx can carry a hyperlink to a javascript: URL. Rendered into a page on
 * this origin (or a popup that inherits it) that would be a clickable script.
 */
function stripUnsafeLinks(root: ParentNode): void {
  for (const a of Array.from(root.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href") ?? "";
    if (/^\s*(javascript|data|vbscript):/i.test(href)) {
      a.removeAttribute("href");
    } else if (/^https?:/i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer noopener");
    }
  }
}

async function fetchDocx(url: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Could not fetch the document (${res.status})`);
  return res.blob();
}

/** Render into an element already on the page (the in-modal preview). */
export async function renderDocxInto(
  url: string,
  container: HTMLElement,
  onStage?: (stage: RenderStage) => void,
  signal?: AbortSignal
): Promise<void> {
  onStage?.("fetching");
  const blob = await fetchDocx(url, signal);
  if (signal?.aborted) return;

  onStage?.("rendering");
  const { renderAsync } = await import("docx-preview");
  container.innerHTML = "";
  await renderAsync(blob, container, undefined, RENDER_OPTIONS);
  stripUnsafeLinks(container);
}

/**
 * Render into a new window and open the print dialog, where "Save as PDF"
 * produces a document laid out like Word's own print output.
 */
export async function printDocxAsPdf(
  url: string,
  fileName: string,
  onStage?: (stage: RenderStage) => void,
  signal?: AbortSignal
): Promise<void> {
  onStage?.("fetching");
  const blob = await fetchDocx(url, signal);

  onStage?.("rendering");
  const { renderAsync } = await import("docx-preview");

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Your browser blocked the popup — allow popups for this site and try again.");
  }

  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${fileName.replace(/\.[^.]+$/, "")}</title></head><body></body></html>`
  );
  win.document.close();

  await renderAsync(blob, win.document.body, win.document.head, RENDER_OPTIONS);
  stripUnsafeLinks(win.document.body);

  // Appended *after* rendering: renderAsync empties the style container it is
  // given, so anything injected beforehand is discarded.
  //
  // docx-preview writes the document's own page size and margins into each
  // section, so the print box must add nothing of its own — no @page margin
  // (that would inset an already-correct page), and none of the on-screen
  // wrapper chrome (grey backdrop, gutters, page shadows).
  const printCss = win.document.createElement("style");
  printCss.textContent = `
    html, body { margin: 0; padding: 0; background: #fff; }
    .docx-wrapper {
      background: #fff !important;
      padding: 0 !important;
      display: block !important;
    }
    .docx-wrapper > section.docx {
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
    @page { margin: 0; size: auto; }
    @media print {
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .docx-wrapper > section.docx { break-after: page; }
      .docx-wrapper > section.docx:last-child { break-after: auto; }
    }
  `;
  win.document.head.appendChild(printCss);

  onStage?.("opening");
  // Give inline images a moment to decode before the print preview snapshots.
  await new Promise((resolve) => setTimeout(resolve, 400));
  win.focus();
  win.print();
}

export function canRenderDocx(name: string): boolean {
  return /\.docx$/i.test(name);
}
