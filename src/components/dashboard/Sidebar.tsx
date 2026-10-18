"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  Target,
  Zap,
  Phone,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clearToken, getRole } from "@/lib/api";
import styles from "./Sidebar.module.css";

const NAV_ALL = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minRole: 3 },
  { label: "Leads", href: "/leads", icon: Zap, minRole: 3 },
  { label: "Contacts", href: "/contacts", icon: Users, minRole: 3 },
  { label: "Companies", href: "/companies", icon: Building2, minRole: 3 },
  { label: "Pipelines", href: "/pipelines", icon: GitBranch, minRole: 2 },
  { label: "Opportunities", href: "/opportunities", icon: Target, minRole: 3 },
  { label: "Calls", href: "/calls", icon: Phone, minRole: 3 },
  { label: "Payments", href: "/payments", icon: CreditCard, minRole: 3 },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, minRole: 3 },
  { label: "Audit Log", href: "/audit", icon: FileText, minRole: 2 },
  { label: "Settings", href: "/settings", icon: Settings, minRole: 2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState(3);

  useEffect(() => { setRole(getRole()); }, []);

  const NAV = NAV_ALL.filter(item => role <= item.minRole);

  function handleLogout() {
    clearToken("workspace");
    router.push("/login");
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.top}>
        <div className={styles.logo}>
          {!collapsed && <span className={styles.logoText}>Financify</span>}
        </div>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <button className={styles.logout} onClick={handleLogout} title={collapsed ? "Logout" : undefined}>
        <LogOut size={18} />
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}
