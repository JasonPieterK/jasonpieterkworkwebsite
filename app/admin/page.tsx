import AdminPanel from "@/components/AdminPanel";
import styles from "./page.module.css";

export default function AdminPage() {
  return (
    <main className="container">
      <div className={styles.adminContainer}>
        <h1 className={styles.title}>Admin Panel</h1>
        <AdminPanel />
      </div>
    </main>
  );
}
