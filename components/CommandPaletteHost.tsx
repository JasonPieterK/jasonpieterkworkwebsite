"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { SearchIndex } from "@/lib/searchIndex";

/**
 * Owns the ⌘K / "/" shortcut and only then downloads the palette itself.
 *
 * The palette pulls in fuzzy matching, icons and a portal — none of which the
 * first paint needs. This host is a few hundred bytes; everything else arrives
 * the moment a key is pressed.
 */
const CommandPalette = lazy(() => import("./CommandPalette"));

export default function CommandPaletteHost({ index }: { index: SearchIndex }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLoaded(true);
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setLoaded(true);
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!loaded) return null;

  return (
    <Suspense fallback={null}>
      <CommandPalette index={index} open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
