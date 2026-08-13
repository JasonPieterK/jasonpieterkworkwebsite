import Link from "next/link";
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
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react/dist/ssr";
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

export default function SubjectCard({ subject, index }: { subject: Subject; index: number }) {
  const color = colorForIndex(index);
  const bg = cardBgForIndex(index);
  const Icon = ICONS[subjectIconKey(subject.name)];

  return (
    <Link
      href={`/subject/${subject.slug}`}
      className={`${styles.card} ${styles[bg]}`}
      style={{ "--rot": rotationForIndex(index), "--i": index } as React.CSSProperties}
    >
      {subject.newCount > 0 && <span className={styles.badge}>{subject.newCount} new</span>}
      <span className={`${styles.iconBadge} ${styles[color]}`}>
        <Icon size={28} weight="bold" color={iconInkColor(color)} />
      </span>
      <h3 className={styles.name}>{subject.name}</h3>
      <p className={styles.count}>
        {subject.fileCount} {subject.fileCount === 1 ? "file" : "files"}
      </p>
    </Link>
  );
}
