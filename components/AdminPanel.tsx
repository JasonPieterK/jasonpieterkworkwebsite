"use client";

import { useState, useEffect } from "react";
import { getSubjects } from "@/lib/github";
import type { Subject, FileEntry, SemesterGroup } from "@/lib/types";
import styles from "./AdminPanel.module.css";

type LockedFiles = Record<string, { locked: boolean; password?: string }>;

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lockedFiles, setLockedFiles] = useState<LockedFiles>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    fetch("/api/admin?action=list", {
      headers: { Authorization: `Bearer ${password}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Invalid password");
        return r.json();
      })
      .then((data) => {
        setAuthenticated(true);
        setLockedFiles(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Auth failed");
      });
  };

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    getSubjects()
      .then(setSubjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load subjects"))
      .finally(() => setLoading(false));
  }, [authenticated]);

  const handleLockFile = async () => {
    if (!selectedFilePath || !newPassword) {
      setError("Select file and enter password");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${password}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "lock",
          path: selectedFilePath,
          password: newPassword,
        }),
      });
      if (!res.ok) throw new Error("Failed to lock file");
      setLockedFiles((prev) => ({
        ...prev,
        [selectedFilePath]: { locked: true, password: newPassword },
      }));
      setSelectedFilePath("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error locking file");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockFile = async (filePath: string) => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${password}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unlock",
          path: filePath,
        }),
      });
      if (!res.ok) throw new Error("Failed to unlock file");
      setLockedFiles((prev) => {
        const newLocked = { ...prev };
        delete newLocked[filePath];
        return newLocked;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error unlocking file");
    } finally {
      setActionLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <div className={styles.formGroup}>
          <label htmlFor="password">Admin Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className={styles.input}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.button}>
          Login
        </button>
      </form>
    );
  }

  const allFiles: (FileEntry & { subjectName: string })[] = [];
  subjects.forEach((subject) => {
    subject.semesters.forEach((semester) => {
      semester.files.forEach((file) => {
        allFiles.push({ ...file, subjectName: subject.name });
      });
    });
  });

  return (
    <div className={styles.panel}>
      <button onClick={() => setAuthenticated(false)} className={styles.logoutBtn}>
        Logout
      </button>

      <section className={styles.section}>
        <h2>Lock a File</h2>
        <div className={styles.formGroup}>
          <label htmlFor="fileSelect">File</label>
          <select
            id="fileSelect"
            value={selectedFilePath}
            onChange={(e) => setSelectedFilePath(e.target.value)}
            className={styles.select}
          >
            <option value="">Select a file...</option>
            {allFiles
              .filter((f) => !lockedFiles[f.path]?.locked)
              .map((f) => (
                <option key={f.path} value={f.path}>
                  {f.subjectName} / {f.name}
                </option>
              ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="newPassword">Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter password students must know"
            className={styles.input}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button
          onClick={handleLockFile}
          disabled={actionLoading || !selectedFilePath || !newPassword}
          className={styles.button}
        >
          {actionLoading ? "Locking..." : "Lock File"}
        </button>
      </section>

      <section className={styles.section}>
        <h2>Locked Files ({Object.keys(lockedFiles).length})</h2>
        {Object.keys(lockedFiles).length === 0 ? (
          <p className={styles.empty}>No locked files yet.</p>
        ) : (
          <div className={styles.lockedList}>
            {Object.entries(lockedFiles)
              .filter(([, data]) => data.locked)
              .map(([filePath]) => {
                const file = allFiles.find((f) => f.path === filePath);
                return (
                  <div key={filePath} className={styles.lockedItem}>
                    <div>
                      <p className={styles.lockedName}>{file?.name || filePath}</p>
                      {file && (
                        <p className={styles.lockedSubject}>
                          {file.subjectName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnlockFile(filePath)}
                      disabled={actionLoading}
                      className={styles.unlockBtn}
                    >
                      Unlock
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
