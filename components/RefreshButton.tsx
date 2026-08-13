"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";
import styles from "./RefreshButton.module.css";

export default function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  async function handleClick() {
    if (spinning) return;
    setSpinning(true);
    try {
      await fetch("/api/revalidate", { method: "POST" });
    } catch {
      // offline or route unreachable — router.refresh() still re-reads whatever cache exists
    }
    router.refresh();
    window.setTimeout(() => setSpinning(false), 700);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={styles.btn}
      aria-label="Sync latest from GitHub"
      title="Sync latest from GitHub"
    >
      <ArrowsClockwise size={20} weight="bold" className={spinning ? styles.spinning : undefined} />
    </button>
  );
}
