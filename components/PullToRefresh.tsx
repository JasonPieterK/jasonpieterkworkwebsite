"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";
import styles from "./PullToRefresh.module.css";

const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const pullRef = useRef(0);

  useEffect(() => {
    pullRef.current = pull;
  }, [pull]);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current || startY.current === null) return;
      if (window.scrollY > 0) {
        tracking.current = false;
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      setPull(dy <= 0 ? 0 : Math.min(dy, MAX_PULL));
    }

    async function onTouchEnd() {
      if (!tracking.current) return;
      tracking.current = false;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        window.dispatchEvent(new Event("progress:start"));
        try {
          await fetch("/api/revalidate", { method: "POST" });
        } catch {
          // offline — router.refresh() below still re-reads whatever cache exists
        }
        router.refresh();
        window.setTimeout(() => {
          setRefreshing(false);
          setPull(0);
          window.dispatchEvent(new Event("progress:done"));
        }, 500);
      } else {
        setPull(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [router, refreshing]);

  const progress = Math.min(pull / THRESHOLD, 1);
  const visible = pull > 4 || refreshing;

  return (
    <div
      className={styles.indicator}
      style={{
        opacity: visible ? 1 : 0,
        transform: `translate(-50%, ${Math.min(pull, THRESHOLD) - 32}px)`,
      }}
      aria-hidden="true"
    >
      <ArrowsClockwise
        size={20}
        weight="bold"
        className={refreshing ? styles.spinning : undefined}
        style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
      />
    </div>
  );
}
