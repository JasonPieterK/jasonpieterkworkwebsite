import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOut, GitCommit } from "@phosphor-icons/react/dist/ssr";
import { getChangelog } from "@/lib/github";
import { OWNER, REPO, BRANCH } from "@/lib/repoLinks";
import { extLabel, formatDate, relativeDate } from "@/lib/utils";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every change to the course materials, newest first, straight from GitHub.",
};

const HISTORY_URL = `https://github.com/${OWNER}/${REPO}/commits/${BRANCH}`;

/** Local calendar day (YYYY-MM-DD) for an ISO timestamp. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ACTION_CLASS: Record<string, string> = {
  Added: styles.added,
  Updated: styles.updated,
  Removed: styles.removed,
  Renamed: styles.renamed,
};

export default async function ChangelogPage() {
  const entries = await getChangelog();

  // Group by calendar day so the timeline reads like a diary. Grouping on the
  // raw UTC slice put a 23:00Z commit under the previous day for most readers,
  // and could disagree with the date printed on the heading.
  const days = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = dayKey(entry.date);
    days.set(key, [...(days.get(key) ?? []), entry]);
  }

  return (
    <main className="container">
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>What changed</p>
          <h1 className={styles.title}>Changelog</h1>
          <p className={styles.lede}>
            Every file added or updated, newest first — pulled live from the materials repository.
          </p>
        </div>
        <a href={HISTORY_URL} target="_blank" rel="noreferrer" className={`mmm-btn ${styles.ghBtn}`}>
          <GitCommit size={18} weight="bold" />
          Full history on GitHub
          <ArrowSquareOut size={14} weight="bold" />
        </a>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>
          Couldn&rsquo;t reach GitHub right now — try refreshing in a minute.
        </p>
      ) : (
        <ol className={styles.timeline}>
          {[...days.entries()].map(([day, dayEntries], dayIndex) => (
            <li key={day} className={styles.day} style={{ "--d": dayIndex } as React.CSSProperties}>
              <div className={styles.dayHead}>
                <span className={styles.dayDate}>{formatDate(dayEntries[0].date)}</span>
                <span className={styles.dayAgo}>{relativeDate(dayEntries[0].date)}</span>
              </div>

              <div className={styles.entries}>
                {dayEntries.map((entry, i) => (
                  <article
                    key={entry.sha}
                    className={styles.entry}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <span className={styles.dot} aria-hidden="true" />
                    <div className={styles.entryHead}>
                      {entry.action && (
                        <span className={`${styles.badge} ${ACTION_CLASS[entry.action] ?? ""}`}>
                          {entry.action}
                        </span>
                      )}
                      <h2 className={styles.entryTitle}>
                        {entry.action ? entry.title.slice(entry.action.length).trim() : entry.title}
                      </h2>
                    </div>

                    {entry.scope && <p className={styles.scope}>{entry.scope}</p>}

                    {entry.changes.length > 0 && (
                      <ul className={styles.changes}>
                        {entry.changes.map((change, j) => (
                          <li key={j} className={styles.change}>
                            {/*
                              A text chip rather than a per-file icon: each
                              Phosphor icon inlines ~500 bytes of SVG here and
                              again in the RSC payload, which is most of this
                              page's weight at 60 commits.
                            */}
                            <span className={styles.changeExt}>{extLabel(change.name)}</span>
                            {change.verb && <span className={styles.changeVerb}>{change.verb}</span>}
                            <span className={styles.changePath}>{change.path}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <a
                      href={entry.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.sha}
                      title="View this commit on GitHub"
                    >
                      <GitCommit size={13} weight="bold" />
                      {entry.shortSha}
                    </a>
                  </article>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      <Link href="/" className={styles.back}>
        ← Back to all subjects
      </Link>
    </main>
  );
}
