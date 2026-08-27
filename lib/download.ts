/**
 * Fetch a file with progress reporting, then hand it to the browser as a
 * save. `onProgress` gets 0–100, or null when the server sends no
 * Content-Length (bar falls back to indeterminate).
 */
export async function downloadWithProgress(
  url: string,
  fallbackName: string,
  onProgress: (pct: number | null, receivedBytes: number) => void,
  signal?: AbortSignal,
  onResponse?: (res: Response) => void,
  trackKey?: string
): Promise<void> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  onResponse?.(res);

  const filename = filenameFrom(res.headers.get("content-disposition")) ?? fallbackName;
  const total = Number(res.headers.get("content-length")) || 0;

  let blob: Blob;
  if (!res.body) {
    onProgress(null, 0);
    blob = await res.blob();
  } else {
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value as BlobPart);
      received += value.length;
      onProgress(total ? Math.min(99, (received / total) * 100) : null, received);
    }
    blob = new Blob(chunks, { type: res.headers.get("content-type") ?? "application/octet-stream" });
  }

  onProgress(100, blob.size);

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // ponytail: fixed delay instead of tracking the save dialog. Generous on
  // purpose — with "always ask where to save" enabled, revoking after a few
  // seconds produces a failed or 0-byte file while the dialog is still open.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);

  if (trackKey) {
    fetch("/api/track-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: trackKey }),
      keepalive: true,
    }).catch(() => {});
  }
}

function filenameFrom(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : null;
}
