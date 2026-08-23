"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Books, MagnifyingGlass, Star } from "@phosphor-icons/react";
import type { Subject } from "@/lib/types";
import { fileIconFor } from "@/lib/fileIcon";
import { extLabel, formatBytes } from "@/lib/utils";
import { STARRED_KEY, useLocalList } from "@/lib/useLocalList";
import { useExitAnimation } from "@/lib/useExitAnimation";
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

export default function CommandPalette({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const starred = useLocalList(STARRED_KEY);
  const shell = useExitAnimation(open, 200);

  useEffect(() => setMounted(true), []);

  const index = useMemo<Item[]>(() => {
    const items: Item[] = [];
    for (const subject of subjects) {
      items.push({
        kind: "subject",
        id: subject.slug,
        name: subject.name,
        sub: `${subject.fileCount} file${subject.fileCount === 1 ? "" : "s"}`,
        href: `/subject/${subject.slug}`,
      });
      for (const group of subject.semesters) {
        for (const file of group.files) {
          items.push({
            kind: "file",
            id: file.path,
            name: file.name,
            sub: `${subject.name} · ${group.semester}`,
            href: `/subject/${subject.slug}`,
            ext: extLabel(file.name),
            size: file.size,
          });
        }
      }
    }
    return items;
  }, [subjects]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Empty query: starred first, then subjects — a useful default, not a blank box.
      const starredItems = index.filter((i) => i.kind === "file" && starred.items.includes(i.id));
      return [...starredItems, ...index.filter((i) => i.kind === "subject")].slice(0, MAX_RESULTS);
    }
    return index
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
  }, [index, query, starred.items]);

  useEffect(() => setCursor(0), [query]);

  // Global shortcuts: ⌘K / Ctrl+K opens the palette, "/" focuses search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      // Focus after the portal paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function go(item: Item) {
    setOpen(false);
    router.push(item.kind === "file" ? `${item.href}?file=${encodeURIComponent(item.id)}` : item.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
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
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
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
          {results.map((item, i) => {
            const Icon = item.kind === "file" ? fileIconFor(item.name) : Books;
            return (
              <button
                key={`${item.kind}:${item.id}`}
                type="button"
                data-active={i === cursor}
                className={`${styles.row} ${i === cursor ? styles.rowActive : ""}`}
                style={{ "--i": i } as React.CSSProperties}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(item)}
              >
                <Icon size={18} weight="bold" className={styles.rowIcon} aria-hidden="true" />
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
            );
          })}
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
