import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOut, Scroll } from "@phosphor-icons/react/dist/ssr";
import { OWNER, REPO, BRANCH } from "@/lib/repoLinks";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "License",
  description: "The MIT License covering this site and its course materials.",
};

const HOLDER = "Jason Pieter Kusumajaya";
const YEAR = 2026;
const LICENSE_URL = `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/LICENSE`;

/** The MIT License, verbatim apart from the copyright line. */
const BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

export default function LicensePage() {
  return (
    <main className="container">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Terms</p>
        <h1 className={styles.title}>License</h1>
      </div>

      <article className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.badge}>
            <Scroll size={20} weight="bold" aria-hidden="true" />
          </span>
          <div>
            <h2 className={styles.licenseName}>MIT License</h2>
            <p className={styles.copyright}>
              Copyright &copy; {YEAR} <strong>{HOLDER}</strong>
            </p>
          </div>
        </div>

        {BODY.split("\n\n").map((paragraph, i) => (
          <p key={i} className={styles.clause}>
            {paragraph}
          </p>
        ))}
      </article>

      <p className={styles.note}>
        In plain terms: you may use, copy and share this work freely, including for your own
        projects, as long as the copyright notice above travels with it. It comes with no warranty.
      </p>

      <div className={styles.links}>
        <a href={LICENSE_URL} target="_blank" rel="noreferrer" className={styles.ghLink}>
          Read it on GitHub
          <ArrowSquareOut size={13} weight="bold" />
        </a>
        <Link href="/" className={styles.back}>
          ← Back to all subjects
        </Link>
      </div>
    </main>
  );
}
