import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import styles from "../license/page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What this site collects, why, and how to opt out.",
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "What this site is",
    body:
      "jasonpieterkwork is a personal site that mirrors class materials from a private GitHub repository. It is run by one person, not an organization, for a small group of students.",
  },
  {
    title: "Local storage (not cookies)",
    body:
      "The site does not use tracking cookies. It uses your browser's local storage for a few small things: which files you've starred, a random session id (so usage data can be grouped without identifying you by name), and — only on /admin — the admin login, if \"Remember me\" is checked. None of this is sent anywhere except this site's own server.",
  },
  {
    title: "Usage analytics — only with your consent",
    body:
      "If you click Accept on the banner, the site logs: which pages you visit and which files you download, your IP address and an approximate location derived from it (country/city, never precise), your device type, browser, operating system, screen size, and language, and how long each page stayed open. This exists so the site owner can see which materials are actually being used, and fix broken links or slow pages. If you click Decline, none of this is recorded — the site still works exactly the same, files still download normally.",
  },
  {
    title: "Wrong-password attempts on locked files",
    body:
      "Some files are marked \"not released yet\" and gated behind a passcode. Incorrect passcode attempts are always logged (device, IP, which file) regardless of the analytics choice above — this is treated as a security measure, not general tracking, since it's the only way to notice someone trying to guess their way into unreleased material.",
  },
  {
    title: "Who can see this data",
    body:
      "Only the site owner, via a password-protected admin panel. It is not sold, shared, or used for advertising — there is no advertising on this site. It is stored in a Supabase database and kept indefinitely for now, since usage volume is small enough that it doesn't need automatic deletion; ask if you'd like your data removed.",
  },
  {
    title: "Third parties involved",
    body:
      "Downloads and previews are proxied through this server from a private GitHub repository (GitHub sees the server's requests, not yours). Country/city lookups for IP addresses are done through ipwho.is, a free lookup service — your IP is sent to them for that single lookup and is not otherwise shared. The site itself is hosted on Vercel and its data on Supabase; both can see standard server logs (IP, timestamp) as part of normally operating the service.",
  },
  {
    title: "Your choices",
    body:
      "You can decline analytics at any time from the consent banner, or clear your browser's local storage to remove your starred files, session id, and remembered admin login. Declining doesn't block or degrade any part of the site — it only stops usage logging.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="container">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Privacy Policy</h1>
      </div>

      <article className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.badge}>
            <ShieldCheck size={20} weight="bold" aria-hidden="true" />
          </span>
          <div>
            <h2 className={styles.licenseName}>What&rsquo;s collected, and why</h2>
            <p className={styles.copyright}>Last updated 2026-08-28</p>
          </div>
        </div>

        {SECTIONS.map((s) => (
          <div key={s.title} className={styles.clause}>
            <strong>{s.title}.</strong> {s.body}
          </div>
        ))}
      </article>

      <p className={styles.note}>
        In plain terms: starring files and staying logged into /admin uses local storage, not
        cookies. Usage analytics (what devices download what) only runs if you say yes on the
        banner — say no and the site works exactly the same.
      </p>

      <div className={styles.links}>
        <Link href="/" className={styles.back}>
          ← Back to all subjects
        </Link>
      </div>
    </main>
  );
}
