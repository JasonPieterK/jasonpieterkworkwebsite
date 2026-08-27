"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Lock, WarningCircle, X } from "@phosphor-icons/react";
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
  const [showField, setShowField] = useState(false);
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
        setError("Incorrect code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={`${fileName} — not released yet`}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.iconBadge}>
              <Lock size={22} weight="bold" aria-hidden="true" />
            </span>
            <h3 className={styles.name}>Not released yet</h3>
          </div>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onCancel}>
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.message}>
            <strong>{fileName}</strong> is not released yet.
          </p>
          <p className={styles.subtitle}>Check back later, or use an early access code if you have one.</p>

          {!showField ? (
            <button
              type="button"
              className={styles.earlyAccessToggle}
              onClick={() => setShowField(true)}
            >
              Have an early access code?
            </button>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter code"
                className={`mmm-input ${styles.input}`}
                autoFocus
                disabled={loading}
              />
              {error && (
                <p className={styles.error}>
                  <WarningCircle size={14} weight="bold" /> {error}
                </p>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`mmm-btn mmm-btn--ghost ${styles.actionBtn}`}
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`mmm-btn ${styles.actionBtn} ${styles.unlockBtn}`}
                  disabled={loading || !password}
                >
                  {loading ? "Checking…" : "Unlock"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
