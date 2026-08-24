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
  useBase64URL: true, // inline images, so printing has nothing to wait on

  /**
   * Positions tab stops from the paragraph's own tab definitions. Off by
   * default, which renders every tab as a single em-space — Word documents
   * lean on tabs for alignment constantly, so this is the difference between
   * aligned columns and text that drifts.
   */
  experimental: true,

  /**
   * Honour the page breaks Word itself recorded in the file, instead of
   * re-flowing and guessing where pages end. This is what makes the printed
   * page count and page contents line up with what Word shows.
   */
  ignoreLastRenderedPageBreak: false,

  /** Drops the on-screen wrapper chrome from printed output. */
  hideWrapperOnPrint: true,
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

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
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
/**
 * Render into a hidden iframe and open the print dialog, where "Save as PDF"
 * produces a document laid out like Word's own print output.
 *
 * An iframe rather than a popup on purpose: the document has to be fetched and
 * the renderer dynamically imported first, and by the time those awaits
 * resolve the user-activation token from the click is gone, so window.open is
 * blocked. Printing a same-document iframe needs no gesture and no popup
 * permission.
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

  const frame = document.createElement("iframe");
  // Off-screen rather than display:none — a hidden iframe has no layout, and
  // docx-preview needs real dimensions to lay the pages out.
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;visibility:hidden";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error("Could not prepare the document for printing.");
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      fileName.replace(/\.[^.]+$/, "")
    )}</title></head><body></body></html>`
  );
  doc.close();

  await renderAsync(blob, doc.body, doc.head, RENDER_OPTIONS);
  stripUnsafeLinks(doc.body);

  // Appended *after* rendering: renderAsync empties the style container it is
  // given, so anything injected beforehand is discarded.
  //
  // docx-preview writes the document's own page size and margins into each
  // section, so the print box must add nothing of its own — no @page margin
  // (that would inset an already-correct page), and none of the on-screen
  // wrapper chrome (grey backdrop, gutters, page shadows).
  const printCss = doc.createElement("style");
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
  doc.head.appendChild(printCss);

  onStage?.("opening");
  // Give inline images a moment to decode before the print preview snapshots.
  await new Promise((resolve) => setTimeout(resolve, 400));

  // The browser names the saved file after the document title, so set the
  // parent title too — some browsers read that one instead.
  const previousTitle = document.title;
  document.title = fileName.replace(/\.[^.]+$/, "");

  const cleanup = () => {
    document.title = previousTitle;
    frame.remove();
  };
  win.addEventListener("afterprint", cleanup, { once: true });
  // Fallback for browsers that never fire afterprint (older Safari).
  setTimeout(cleanup, 60_000);

  win.focus();
  win.print();
}

export function canRenderDocx(name: string): boolean {
  return /\.docx$/i.test(name);
}
