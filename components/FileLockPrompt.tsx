"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Lock, X } from "@phosphor-icons/react";
import styles from "./FileLockPrompt.module.css";

export default function FileLockPrompt({
  fileName,
  onUnlock,
  onCancel,
}: {
  fileName: string;
  onUnlock: (password: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await onUnlock(password);
      if (!success) {
        setError("Incorrect password");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify password"
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.lockIcon}>
              <Lock size={24} weight="fill" />
            </span>
            <h3 className={styles.title}>File Locked</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.message}>
            <strong>{fileName}</strong> is not yet released.
          </p>
          <p className={styles.subtitle}>Enter the password to access it.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={styles.input}
              autoFocus
              disabled={loading}
            />
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading || !password}
              >
                {loading ? "Checking..." : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
