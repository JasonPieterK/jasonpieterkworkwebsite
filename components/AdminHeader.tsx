"use client";

import { ArrowLeft, GearSix, SignOut } from "@phosphor-icons/react";
import styles from "./AdminHeader.module.css";

export default function AdminHeader({
  view,
  onBack,
  onSettings,
  onLogout,
}: {
  view: "subjects" | "subject" | "settings";
  onBack: () => void;
  onSettings: () => void;
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
