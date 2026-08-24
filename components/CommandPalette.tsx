"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Books, MagnifyingGlass, Star } from "@phosphor-icons/react";
import type { SearchIndex } from "@/lib/searchIndex";
import FileIcon from "./FileIcon";
import { extLabel, formatBytes } from "@/lib/utils";
import { STARRED_KEY, useLocalList } from "@/lib/useLocalList";
import { useExitAnimation } from "@/lib/useExitAnimation";
import { useIsClient } from "@/lib/useIsClient";
import styles from "./CommandPalette.module.css";

type Item =
  | { kind: "subject"; id: string; name: string; sub: string; href: string }
  | { kind: "file"; id: string; name: string; sub: string; href: string; ext: string; size: number };

const MAX_RESULTS = 12;

/** Subsequence match — "mtwk" finds "MATH worksheet". Returns a rank, or -1. */
function score(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return 0;
  const direct = h.indexOf(n);
  if (direct !== -1) return direct; // contiguous matches always win

  let i = 0;
  let gaps = 0;
  let last = -1;
  for (const ch of n) {
    const found = h.indexOf(ch, i);
    if (found === -1) return -1;
    if (last !== -1) gaps += found - last - 1;
    last = found;
    i = found + 1;
  }
  return 1000 + gaps;
}

export default function CommandPalette({
  index,
  open,
  onOpenChange,
}: {
  index: SearchIndex;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const mounted = useIsClient();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const starred = useLocalList(STARRED_KEY);
  const shell = useExitAnimation(open, 260);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = index.subjects.map((s) => ({
      kind: "subject" as const,
      id: s.slug,
      name: s.name,
      sub: `${s.fileCount} file${s.fileCount === 1 ? "" : "s"}`,
      href: `/subject/${s.slug}`,
    }));
    for (const f of index.files) {
      out.push({
        kind: "file",
        id: f.path,
        name: f.name,
        sub: `${f.subject} · ${f.semester}`,
        href: `/subject/${f.slug}`,
        ext: extLabel(f.name),
        size: f.size,
      });
    }
    return out;
  }, [index]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Empty query: starred first, then subjects — a useful default, not a blank box.
      const starredItems = items.filter((i) => i.kind === "file" && starred.items.includes(i.id));
      return [...starredItems, ...items.filter((i) => i.kind === "subject")].slice(0, MAX_RESULTS);
    }
    return items
      .map((item) => {
        const own = score(item.name, query);
        const ctx = score(`${item.name} ${item.sub}`, query);
        const best = own === -1 ? ctx : Math.min(own, ctx);
        return { item, rank: best };
      })
      .filter((r) => r.rank !== -1)
      .sort((a, b) => a.rank - b.rank || a.item.name.length - b.item.name.length)
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
  }, [items, query, starred.items]);

  // Reset the highlight when the query changes — adjusted during render, which
  // React re-runs immediately without painting the stale cursor.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setCursor(0);
  }

  // A fresh open starts from a blank box.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQuery("");
  }

  // Focus after the portal paints (a DOM effect, not a state update).
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function go(item: Item) {
    onOpenChange(false);
    // Hash, not a query param: keeps subject pages statically prerenderable.
    router.push(item.kind === "file" ? `${item.href}#${encodeURIComponent(item.id)}` : item.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") onOpenChange(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor]);
    }
  }

  if (!mounted || !shell.mounted) return null;

  return createPortal(
    <div
      className={`${styles.overlay} ${shell.closing ? styles.overlayClosing : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div
        className={`${styles.panel} ${shell.closing ? styles.panelClosing : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search everything"
      >
        <div className={styles.inputRow}>
          <MagnifyingGlass size={20} weight="bold" className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            placeholder="Search subjects and files…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            aria-label="Search subjects and files"
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>

        <div className={styles.results} ref={listRef}>
          {results.length === 0 && <p className={styles.empty}>Nothing matches “{query}”.</p>}
          {results.map((item, i) => (
            <button
              key={`${item.kind}:${item.id}`}
              type="button"
              data-active={i === cursor}
              className={`${styles.row} ${i === cursor ? styles.rowActive : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(item)}
            >
              {item.kind === "file" ? (
                <FileIcon
                  name={item.name}
                  size={18}
                  weight="bold"
                  className={styles.rowIcon}
                  aria-hidden="true"
                />
              ) : (
                <Books size={18} weight="bold" className={styles.rowIcon} aria-hidden="true" />
              )}
              <span className={styles.rowText}>
                <span className={styles.rowName}>
                  {item.name}
                  {item.kind === "file" && starred.items.includes(item.id) && (
                    <Star size={12} weight="fill" className={styles.rowStar} />
                  )}
                </span>
                <span className={styles.rowSub}>{item.sub}</span>
              </span>
              {item.kind === "file" && (
                <span className={styles.rowMeta}>
                  {item.ext}
                  {item.size > 0 && ` · ${formatBytes(item.size)}`}
                </span>
              )}
              <ArrowRight size={14} weight="bold" className={styles.rowArrow} />
            </button>
          ))}
        </div>

        <div className={styles.footer}>
          <span>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd> navigate
          </span>
          <span>
            <kbd className={styles.kbd}>↵</kbd> open
          </span>
          <span>
            <kbd className={styles.kbd}>/</kbd> or <kbd className={styles.kbd}>⌘K</kbd> anytime
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
