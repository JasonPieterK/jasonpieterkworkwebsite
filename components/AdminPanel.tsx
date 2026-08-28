"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { Subject } from "@/lib/types";
import { githubTreeUrl } from "@/lib/repoLinks";
import SubjectCard from "./SubjectCard";
import SemesterTabs from "./SemesterTabs";
import AdminHeader from "./AdminHeader";
import AdminSettings from "./AdminSettings";
import AdminAnalytics from "./AdminAnalytics";
import styles from "./AdminPanel.module.css";
import homeStyles from "@/app/page.module.css";
import subjectStyles from "@/app/subject/[name]/page.module.css";

type View = "subjects" | "subject" | "settings" | "analytics";
type FileFlagsMap = Record<string, { hidden?: boolean; locked?: boolean }>;
type Passcode = { id: string; code: string; label: string; createdAt: string };

const REMEMBER_KEY = "smp:admin-token";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

  const authenticate = useCallback(
    (pw: string) => {
      setToken(pw);
      loadSubjects(pw);
      loadPasscodes(pw);
    },
    [loadSubjects, loadPasscodes]
  );

  // Remembered token is only ever read once, on mount — a user action
  // (submitting the form), not a render-driven effect with a setState loop.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(REMEMBER_KEY);
    } catch {
      // private mode / storage blocked — fall through to the login form
    }
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a remembered login on mount
      setRememberMe(true);
      authenticate(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
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
      try {
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, password);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // storage blocked — session still works, just won't survive a reload
      }
      authenticate(password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setPassword("");
    setView("subjects");
    try {
      localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // ignore
    }
  }

  // Optimistic: the pill and button flip the instant you click, before the
  // network round trip. getSubjects({includeHidden:true}) already counts
  // hidden files, so fileCount badges stay correct without a re-fetch — a
  // failed request just rolls the local flag back and surfaces the error.
  function toggleFlag(filePath: string, key: "toggleHide" | "toggleLock", currentValue: boolean) {
    if (!token) return;
    const flagKey = key === "toggleHide" ? "hidden" : "locked";
    const nextValue = !currentValue;

    setFlags((prev) => ({ ...prev, [filePath]: { ...prev[filePath], [flagKey]: nextValue } }));

    fetch("/api/admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: key, path: filePath, value: nextValue }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");
        setFlags(data.flags);
      })
      .catch((err) => {
        setFlags((prev) => ({ ...prev, [filePath]: { ...prev[filePath], [flagKey]: currentValue } }));
        setError(err instanceof Error ? err.message : "Error updating file");
      });
  }

  if (!token) {
    return (
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <h2 className={styles.loginTitle}>Admin access</h2>
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <div className={styles.passwordField}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className={`mmm-input ${styles.passwordInput}`}
              autoComplete={rememberMe ? "current-password" : "off"}
              autoFocus
            />
            <button
              type="button"
              className={styles.visibilityToggle}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
            </button>
          </div>
        </div>
        <label className={styles.rememberRow}>
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          Remember me on this device
        </label>
        {loginError && <p className={styles.error}>{loginError}</p>}
        <button type="submit" className="mmm-btn" disabled={loginLoading || !password}>
          {loginLoading ? "Checking…" : "Login"}
        </button>
      </form>
    );
  }

  const activeSubject = subjects.find((s) => s.slug === activeSlug) ?? null;

  return (
    <div>
      <AdminHeader
        view={view}
        onBack={() => {
          setView("subjects");
          setActiveSlug(null);
        }}
        onSettings={() => setView("settings")}
        onAnalytics={() => setView("analytics")}
        onLogout={handleLogout}
      />

      {error && <p className={styles.error}>{error}</p>}

      {view === "settings" && <AdminSettings token={token} codes={codes} onCodesChange={setCodes} />}

      {view === "analytics" && <AdminAnalytics token={token} />}

      {view === "subjects" &&
        (loading ? (
          <p className={styles.hint}>Loading…</p>
        ) : (
          <div className={homeStyles.grid}>
            {subjects.map((s, i) => (
              <SubjectCard
                key={s.slug}
                subject={s}
                index={i}
                onClick={() => {
                  setActiveSlug(s.slug);
                  setView("subject");
                }}
              />
            ))}
          </div>
        ))}

      {view === "subject" && activeSubject && (
        <>
          <button
            type="button"
            className={subjectStyles.back}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
            onClick={() => {
              setView("subjects");
              setActiveSlug(null);
            }}
          >
            ← Back to all subjects
          </button>
          <div className={subjectStyles.head}>
            <h1 className={subjectStyles.title}>{activeSubject.name}</h1>
            <div className={subjectStyles.headActions}>
              <a
                href={githubTreeUrl(activeSubject.name)}
                target="_blank"
                rel="noreferrer"
                className={subjectStyles.ghLink}
              >
                Open on GitHub
              </a>
            </div>
          </div>
          <SemesterTabs
            subjectSlug={activeSubject.slug}
            semesters={activeSubject.semesters}
            getAdminControls={(path) => ({
              hidden: Boolean(flags[path]?.hidden),
              locked: Boolean(flags[path]?.locked),
              onToggleHide: () => toggleFlag(path, "toggleHide", Boolean(flags[path]?.hidden)),
              onToggleLock: () => toggleFlag(path, "toggleLock", Boolean(flags[path]?.locked)),
            })}
          />
        </>
      )}
    </div>
  );
}
