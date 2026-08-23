"use client";

import { Star } from "@phosphor-icons/react";
import { STARRED_KEY, useLocalList } from "@/lib/useLocalList";
import styles from "./StarButton.module.css";

export default function StarButton({ path, label }: { path: string; label: string }) {
  const { toggle, has } = useLocalList(STARRED_KEY);
  const starred = has(path);

  return (
    <button
      type="button"
      className={`${styles.star} ${starred ? styles.starred : ""}`}
      aria-pressed={starred}
      title={starred ? "Remove from starred" : "Star this file"}
      aria-label={starred ? `Unstar ${label}` : `Star ${label}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(path);
      }}
    >
      <Star size={16} weight={starred ? "fill" : "bold"} />
    </button>
  );
}
