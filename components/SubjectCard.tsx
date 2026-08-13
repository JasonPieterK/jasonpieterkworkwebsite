import Link from "next/link";
import type { Subject } from "@/lib/types";
import { colorForIndex, illustrationForIndex, rotationForIndex } from "@/lib/theme";
import styles from "./SubjectCard.module.css";

export default function SubjectCard({ subject, index }: { subject: Subject; index: number }) {
  const color = colorForIndex(index);

  return (
    <Link
      href={`/subject/${subject.slug}`}
      className={`${styles.card} ${styles[color]}`}
      style={{ "--rot": rotationForIndex(index), "--i": index } as React.CSSProperties}
    >
      {subject.newCount > 0 && <span className={styles.badge}>{subject.newCount} new</span>}
      <img className={styles.illu} src={illustrationForIndex(index)} alt="" />
      <h3 className={styles.name}>{subject.name}</h3>
      <p className={styles.count}>
        {subject.fileCount} {subject.fileCount === 1 ? "file" : "files"}
      </p>
    </Link>
  );
}
