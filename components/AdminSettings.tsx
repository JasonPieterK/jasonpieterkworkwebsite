"use client";

import { useState } from "react";
import { Copy, Trash } from "@phosphor-icons/react";
import styles from "./AdminSettings.module.css";

type Passcode = { id: string; code: string; label: string; createdAt: string };

export default function AdminSettings({
  token,
  codes,
  onCodesChange,
}: {
  token: string;
  codes: Passcode[];
  onCodesChange: (codes: Passcode[]) => void;
}) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isValid = /^\d{6}$/.test(code);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setError("Code must be exactly 6 digits");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addPasscode", code, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add passcode");
      onCodesChange(data.codes);
      setCode("");
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding passcode");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removePasscode", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove passcode");
      onCodesChange(data.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error removing passcode");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(c: string, id: string) {
    navigator.clipboard.writeText(c).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1200);
    });
  }

  return (
    <div className={styles.wrap}>
      <section className="mmm-card">
        <h2 className="h3">Unlock passcodes</h2>
        <p className={styles.hint}>
          Any of these 6-digit codes unlocks every locked file. Give one out, add as many as you need.
        </p>

        <form onSubmit={handleAdd} className={styles.form}>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            aria-label="New 6-digit passcode"
            className={`mmm-input ${styles.codeInput}`}
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional) — e.g. Class A"
            aria-label="Passcode label (optional)"
            className={`mmm-input ${styles.labelInput}`}
          />
          <button type="submit" className="mmm-btn mmm-btn--mode" disabled={loading || !isValid}>
            Add code
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}

        {codes.length === 0 ? (
          <p className={styles.empty}>No passcodes yet — locked files can&rsquo;t be opened until you add one.</p>
        ) : (
          <ul className={styles.list}>
            {codes.map((c) => (
              <li key={c.id} className={styles.row}>
                <span className={styles.codeText}>{c.code}</span>
                {c.label && <span className={styles.label}>{c.label}</span>}
                <span className={styles.spacer} />
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => handleCopy(c.code, c.id)}
                  title="Copy code"
                >
                  <Copy size={16} weight="bold" />
                  {copiedId === c.id ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.deleteBtn}`}
                  onClick={() => handleRemove(c.id)}
                  disabled={loading}
                  title="Remove code"
                >
                  <Trash size={16} weight="bold" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
