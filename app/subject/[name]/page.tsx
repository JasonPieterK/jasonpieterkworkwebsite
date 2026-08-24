import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject, getSubjects } from "@/lib/github";
import { githubTreeUrl } from "@/lib/repoLinks";
import SemesterTabs from "@/components/SemesterTabs";
import ZipButton from "@/components/ZipButton";
import styles from "./page.module.css";

/**
 * Prerender every subject at build time and refresh on the shared revalidate
 * window. Rendering on demand cost ~1.5s TTFB because each request re-walked
 * the GitHub tree and commit list.
 */
export async function generateStaticParams() {
  const subjects = await getSubjects();
  return subjects.map((s) => ({ name: s.slug }));
}

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
      {subject.metaIncomplete && (
        <p className={styles.metaNotice}>
          GitHub didn&rsquo;t return change history just now, so dates and New/Updated badges are
          missing. The files below are current — try the refresh button in a minute.
        </p>
      )}
      <SemesterTabs semesters={subject.semesters} />
    </main>
  );
}
