import type { CSSProperties } from "react";
import { EyeSlash, LockSimple, LockSimpleOpen, Eye } from "@phosphor-icons/react";
import type { FileEntry } from "@/lib/types";
import { extLabel, formatBytes, formatDate } from "@/lib/utils";
import FileIcon from "./FileIcon";
import styles from "./AdminFileCard.module.css";

export default function AdminFileCard({
  file,
  index = 0,
  hidden,
  locked,
  onToggleHide,
  onToggleLock,
}: {
  file: FileEntry;
  index?: number;
  hidden: boolean;
  locked: boolean;
  onToggleHide: () => void;
  onToggleLock: () => void;
}) {
  const size = formatBytes(file.size);

  return (
    <div className={`${styles.card} ${hidden ? styles.cardHidden : ""}`} style={{ "--i": index } as CSSProperties}>
      <div className={styles.statusRow}>
        {hidden && <span className={`${styles.statusPill} ${styles.hiddenPill}`}>Hidden</span>}
        {locked && <span className={`${styles.statusPill} ${styles.lockedPill}`}>Locked</span>}
      </div>
      <div className={styles.nameRow}>
        <FileIcon name={file.name} size={20} weight="bold" className={styles.fileIcon} aria-hidden="true" />
        <p className={styles.name}>{file.name}</p>
      </div>
      <div className={styles.meta}>
        <span className={styles.chip}>{extLabel(file.name)}</span>
        {size && <span className={styles.chip}>{size}</span>}
        <span className={styles.date}>{file.lastCommitDate ? formatDate(file.lastCommitDate) : "—"}</span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`mmm-btn mmm-btn--ghost ${styles.actionBtn} ${hidden ? styles.actionActive : ""}`}
          onClick={onToggleHide}
        >
          {hidden ? <Eye size={16} weight="bold" /> : <EyeSlash size={16} weight="bold" />}
          {hidden ? "Unhide" : "Hide"}
        </button>
        <button
          type="button"
          className={`mmm-btn mmm-btn--ghost ${styles.actionBtn} ${locked ? styles.actionActive : ""}`}
          onClick={onToggleLock}
        >
          {locked ? <LockSimpleOpen size={16} weight="bold" /> : <LockSimple size={16} weight="bold" />}
          {locked ? "Unlock" : "Lock"}
        </button>
      </div>
    </div>
  );
}
