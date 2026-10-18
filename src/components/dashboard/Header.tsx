"use client";

import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import styles from "./Header.module.css";

interface Props {
  title: string;
}

export default function Header({ title }: Props) {
  const [workspace, setWorkspace] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWorkspace(localStorage.getItem("crm_workspace_name") || "Workspace");
    }
  }, []);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.right}>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input placeholder="Search..." className={styles.searchInput} />
        </div>
        <button className={styles.iconBtn} aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className={styles.workspacePill}>{workspace}</div>
      </div>
    </header>
  );
}
