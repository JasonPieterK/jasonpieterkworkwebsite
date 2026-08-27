"use client";

import { useState, useCallback } from "react";
import type { Subject } from "@/lib/types";
import AdminHeader from "./AdminHeader";
import AdminSubjectCard from "./AdminSubjectCard";
import AdminFileCard from "./AdminFileCard";
import AdminSettings from "./AdminSettings";
import styles from "./AdminPanel.module.css";

type View = "subjects" | "subject" | "settings";
type FileFlagsMap = Record<string, { hidden?: boolean; locked?: boolean }>;
type Passcode = { id: string; code: string; label: string; createdAt: string };

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [flags, setFlags] = useState<FileFlagsMap>({});
  const [codes, setCodes] = useState<Passcode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [view, setView] = useState<View>("subjects");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const loadSubjects = useCallback((authToken: string) => {
    setLoading(true);
    fetch("/api/admin?action=subjects", { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Session expired");
        return r.json();
      })
      .then((data) => {
        setSubjects(data.subjects);
        setFlags(data.flags);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const loadPasscodes = useCallback((authToken: string) => {
    fetch("/api/admin?action=passcodes", { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => r.json())
      .then((data) => setCodes(data.codes ?? []))
      .catch(() => {});
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${password}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login" }),
      });
      if (!res.ok) throw new Error("Invalid password");
      setToken(password);
      loadSubjects(password);
      loadPasscodes(password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  async function toggleFlag(filePath: string, key: "toggleHide" | "toggleLock", currentValue: boolean) {
    if (!token) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: key, path: filePath, value: !currentValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setFlags(data.flags);
      // Hiding drops the file from the public listing next revalidate, but the
      // admin view keeps it visible — re-fetch to stay in sync with fileCount badges.
      loadSubjects(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating file");
    }
  }

  if (!token) {
    return (
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <h2 className={styles.loginTitle}>Admin access</h2>
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="mmm-input"
            autoFocus
          />
        </div>
        {loginError && <p className={styles.error}>{loginError}</p>}
        <button type="submit" className="mmm-btn" disabled={loginLoading || !password}>
          {loginLoading ? "Checking…" : "Login"}
        </button>
      </form>
    );
  }

  const activeSubject = subjects.find((s) => s.slug === activeSlug) ?? null;
  const lockedCountFor = (subject: Subject) =>
    subject.semesters.flatMap((g) => g.files).filter((f) => flags[f.path]?.locked).length;
  const hiddenCountFor = (subject: Subject) =>
    subject.semesters.flatMap((g) => g.files).filter((f) => flags[f.path]?.hidden).length;

  return (
    <div>
      <AdminHeader
        view={view}
        onBack={() => {
          setView("subjects");
          setActiveSlug(null);
        }}
        onSettings={() => setView("settings")}
        onLogout={() => {
          setToken(null);
          setPassword("");
          setView("subjects");
        }}
      />

      {error && <p className={styles.error}>{error}</p>}

      {view === "settings" && <AdminSettings token={token} codes={codes} onCodesChange={setCodes} />}

      {view === "subjects" && (
        <>
          {loading ? (
            <p className={styles.hint}>Loading…</p>
          ) : (
            <div className={styles.grid}>
              {subjects.map((s, i) => (
                <AdminSubjectCard
                  key={s.slug}
                  subject={s}
                  index={i}
                  lockedCount={lockedCountFor(s)}
                  hiddenCount={hiddenCountFor(s)}
                  onClick={() => {
                    setActiveSlug(s.slug);
                    setView("subject");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === "subject" && activeSubject && (
        <div>
          <h2 className={styles.subjectTitle}>{activeSubject.name}</h2>
          {activeSubject.semesters.map((group) => (
            <div key={group.semester} className={styles.semesterBlock}>
              <h3 className={styles.semesterName}>{group.semester}</h3>
              {group.files.length === 0 ? (
                <p className={styles.hint}>No files.</p>
              ) : (
                <div className={styles.fileGrid}>
                  {group.files.map((f, i) => (
                    <AdminFileCard
                      key={f.path}
                      file={f}
                      index={i}
                      hidden={Boolean(flags[f.path]?.hidden)}
                      locked={Boolean(flags[f.path]?.locked)}
                      onToggleHide={() => toggleFlag(f.path, "toggleHide", Boolean(flags[f.path]?.hidden))}
                      onToggleLock={() => toggleFlag(f.path, "toggleLock", Boolean(flags[f.path]?.locked))}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
