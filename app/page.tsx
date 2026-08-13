import { getSubjects } from "@/lib/github";
import SubjectCard from "@/components/SubjectCard";
import styles from "./page.module.css";

export default async function Home() {
  const subjects = await getSubjects();

  return (
    <main className="container">
      {subjects.length === 0 ? (
        <p className={styles.error}>
          Couldn&rsquo;t reach GitHub right now — try refreshing in a minute.
        </p>
      ) : (
        <div className={styles.grid}>
          {subjects.map((s, i) => (
            <SubjectCard key={s.slug} subject={s} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
