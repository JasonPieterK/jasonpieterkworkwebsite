"use client";

import { ArrowLeft, ChartBar, GearSix, SignOut } from "@phosphor-icons/react";
import styles from "./AdminHeader.module.css";

export default function AdminHeader({
  view,
  onBack,
  onSettings,
  onAnalytics,
  onLogout,
}: {
  view: "subjects" | "subject" | "settings" | "analytics";
  onBack: () => void;
  onSettings: () => void;
  onAnalytics: () => void;
  onLogout: () => void;
}) {
  return (
    <div className={styles.bar}>
      <span className={styles.brand}>Admin</span>
      <div className={styles.actions}>
        {view !== "subjects" && (
          <button type="button" className={styles.navBtn} onClick={onBack}>
            <ArrowLeft size={16} weight="bold" />
            <span>Back</span>
          </button>
        )}
        <button
          type="button"
          className={`${styles.navBtn} ${view === "analytics" ? styles.navBtnActive : ""}`}
          onClick={onAnalytics}
        >
          <ChartBar size={16} weight="bold" />
          <span>Analytics</span>
        </button>
        <button
          type="button"
          className={`${styles.navBtn} ${view === "settings" ? styles.navBtnActive : ""}`}
          onClick={onSettings}
        >
          <GearSix size={16} weight="bold" />
          <span>Settings</span>
        </button>
        <button type="button" className={styles.navBtn} onClick={onLogout}>
          <SignOut size={16} weight="bold" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
