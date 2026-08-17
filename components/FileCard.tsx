import type { CSSProperties } from "react";
import type { FileEntry } from "@/lib/types";
import { formatDate, relativeDate } from "@/lib/utils";
import { getPreviewUrl } from "@/lib/preview";
import styles from "./FileCard.module.css";

export default function FileCard({
  file,
  index = 0,
  banner,
}: {
  file: FileEntry;
  index?: number;
  banner?: "new" | "updated";
}) {
  const previewUrl = getPreviewUrl(file);

  return (
    <div className={styles.card} style={{ "--i": index } as CSSProperties}>
      {banner && (
        <span className={`${styles.banner} ${banner === "new" ? styles.bannerNew : styles.bannerUpdate}`}>
          {banner === "new" ? "New" : "Updated"}
        </span>
      )}
      <p className={styles.name}>{file.name}</p>
      <div className={styles.meta}>
        <span className={styles.date} title={file.lastCommitDate}>
          {file.lastCommitDate ? `${formatDate(file.lastCommitDate)} · ${relativeDate(file.lastCommitDate)}` : "—"}
        </span>
      </div>
      <div className={styles.actions}>
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noreferrer" className="mmm-btn mmm-btn--ghost">
            Preview
          </a>
        )}
        <a href={file.downloadUrl} className="mmm-btn mmm-btn--ghost" download>
          Download
        </a>
        <a href={file.htmlUrl} target="_blank" rel="noreferrer" className={styles.viewLink}>
          View on GitHub
        </a>
      </div>
    </div>
  );
}
