import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject } from "@/lib/github";
import { githubTreeUrl } from "@/lib/repoLinks";
import SemesterTabs from "@/components/SemesterTabs";
import styles from "./page.module.css";

export default async function SubjectPage(props: PageProps<"/subject/[name]">) {
  const { name } = await props.params;
  const subject = await getSubject(name);
  if (!subject) notFound();

  return (
    <main className="container">
      <Link href="/" className={styles.back}>
        ← Back to all subjects
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{subject.name}</h1>
        <a
          href={githubTreeUrl(subject.name)}
          target="_blank"
          rel="noreferrer"
          className="mmm-btn mmm-btn--ghost"
        >
          Open on GitHub to download all
        </a>
      </div>
      <SemesterTabs semesters={subject.semesters} />
    </main>
  );
}
