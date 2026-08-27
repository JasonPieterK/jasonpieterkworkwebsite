import {
  Cross,
  BookOpen,
  ChatText,
  Flask,
  Globe,
  Translate,
  Calculator,
  UsersThree,
  Basketball,
  Scales,
  PaintBrush,
  Desktop,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react/dist/lib/types";
import type { Subject } from "@/lib/types";
import {
  cardBgForIndex,
  colorForIndex,
  iconInkColor,
  rotationForIndex,
  subjectIconKey,
  type IconKey,
} from "@/lib/theme";
import styles from "./SubjectCard.module.css";

const ICONS: Record<IconKey, PhosphorIcon> = {
  cross: Cross,
  bookOpen: BookOpen,
  chatText: ChatText,
  flask: Flask,
  globe: Globe,
  translate: Translate,
  calculator: Calculator,
  usersThree: UsersThree,
  basketball: Basketball,
  scales: Scales,
  paintBrush: PaintBrush,
  desktop: Desktop,
};

export default function AdminSubjectCard({
  subject,
  index,
  lockedCount,
  hiddenCount,
  onClick,
}: {
  subject: Subject;
  index: number;
  lockedCount: number;
  hiddenCount: number;
  onClick: () => void;
}) {
  const color = colorForIndex(index);
  const bg = cardBgForIndex(index);
  const Icon = ICONS[subjectIconKey(subject.name)];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.card} ${styles[bg]}`}
      style={
        {
          "--rot": rotationForIndex(index),
          "--i": index,
          textAlign: "left",
          cursor: "pointer",
          width: "100%",
          font: "inherit",
          appearance: "none",
        } as React.CSSProperties
      }
    >
      {(lockedCount > 0 || hiddenCount > 0) && (
        <span className={styles.banners}>
          {lockedCount > 0 && (
            <span className={styles.banner} style={{ background: "var(--coral)" }}>
              <strong>{lockedCount} locked</strong>
            </span>
          )}
          {hiddenCount > 0 && (
            <span className={styles.banner} style={{ background: "var(--ash)", color: "var(--paper)" }}>
              <strong>{hiddenCount} hidden</strong>
            </span>
          )}
        </span>
      )}
      <span className={`${styles.iconBadge} ${styles[color]}`}>
        <Icon size={28} weight="bold" color={iconInkColor(color)} />
      </span>
      <h3 className={styles.name}>{subject.name}</h3>
      <p className={styles.count}>
        {subject.fileCount} {subject.fileCount === 1 ? "file" : "files"}
      </p>
    </button>
  );
}
