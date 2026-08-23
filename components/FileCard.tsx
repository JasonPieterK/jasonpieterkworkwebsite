import type { CSSProperties } from "react";
import type { FileEntry } from "@/lib/types";
import { extLabel, formatBytes, formatDate, relativeDate } from "@/lib/utils";
import { fileIconFor } from "@/lib/fileIcon";
import DownloadModal from "./DownloadModal";
import StarButton from "./StarButton";
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
  const Icon = fileIconFor(file.name);
  const size = formatBytes(file.size);

  return (
    <div className={styles.card} style={{ "--i": index } as CSSProperties}>
      {banner && (
        <span className={`${styles.banner} ${banner === "new" ? styles.bannerNew : styles.bannerUpdate}`}>
          {banner === "new" ? "New" : "Updated"}
        </span>
      )}
      <div className={styles.nameRow}>
        <Icon size={20} weight="bold" className={styles.fileIcon} aria-hidden="true" />
        <p className={styles.name}>{file.name}</p>
        <StarButton path={file.path} label={file.name} />
      </div>
      <div className={styles.meta}>
        <span className={styles.chip}>{extLabel(file.name)}</span>
        {size && <span className={styles.chip}>{size}</span>}
        <span className={styles.date} title={file.lastCommitDate}>
          {file.lastCommitDate ? `${formatDate(file.lastCommitDate)} · ${relativeDate(file.lastCommitDate)}` : "—"}
        </span>
      </div>
      <div className={styles.actions}>
        <DownloadModal file={file} />
        <a href={file.htmlUrl} target="_blank" rel="noreferrer" className={styles.viewLink}>
          View on GitHub
        </a>
      </div>
    </div>
  );
}
