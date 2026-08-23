import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject } from "@/lib/github";
import { githubTreeUrl } from "@/lib/repoLinks";
import SemesterTabs from "@/components/SemesterTabs";
import ZipButton from "@/components/ZipButton";
import styles from "./page.module.css";

export default async function SubjectPage(props: PageProps<"/subject/[name]">) {
  const { name } = await props.params;
  const subject = await getSubject(name);
  if (!subject) notFound();

  const totalBytes = subject.semesters.reduce(
    (n, g) => n + g.files.reduce((m, f) => m + f.size, 0),
    0
  );

  return (
    <main className="container">
      <Link href="/" className={styles.back}>
        ← Back to all subjects
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{subject.name}</h1>
        <div className={styles.headActions}>
          <ZipButton
            subjectSlug={subject.slug}
            label={subject.name}
            fileCount={subject.fileCount}
            totalBytes={totalBytes}
          />
          <a
            href={githubTreeUrl(subject.name)}
            target="_blank"
            rel="noreferrer"
            className={styles.ghLink}
          >
            Open on GitHub
          </a>
        </div>
      </div>
      <SemesterTabs
        subjectSlug={subject.slug}
        semesters={subject.semesters}
        newestAddedPath={subject.newestAdded?.path}
        newestUpdatedPath={subject.newestUpdated?.path}
      />
    </main>
  );
}
