"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, isLoggedIn, clearToken } from "@/lib/api";
import tStyles from "@/components/ui/DataTable.module.css";

interface Stats { total_workspaces: number; active_workspaces: number; suspended_workspaces: number; total_users: number; }
interface WS { workspace_id: number; workspace_name: string; workspace_slug: string; is_active: boolean; user_count: number; created_at: string; }

export default function PlatformDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [workspaces, setWorkspaces] = useState<WS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn("platform")) { router.replace("/platform/login"); return; }
    Promise.all([
      api.get<Stats>("/platform/stats", "platform"),
      api.get<WS[]>("/platform/workspaces", "platform"),
    ]).then(([s, ws]) => { setStats(s); setWorkspaces(ws); }).finally(() => setLoading(false));
  }, [router]);

  async function toggleSuspend(ws: WS) {
    try {
      if (ws.is_active) {
        await api.patch(`/platform/workspaces/${ws.workspace_id}/suspend`, {}, "platform");
      } else {
        await api.patch(`/platform/workspaces/${ws.workspace_id}/activate`, {}, "platform");
      }
      setWorkspaces(list => list.map(w => w.workspace_id === ws.workspace_id ? { ...w, is_active: !w.is_active } : w));
    } catch (_) { /* ignore */ }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8" }}>
      {/* Platform header */}
      <header style={{ background: "#181818", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.03em" }}>Financify — Platform Admin</span>
        <button onClick={() => { clearToken("platform"); router.push("/platform/login"); }}
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 7, padding: "0.45rem 1rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>
          Logout
        </button>
      </header>

      <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {loading ? <p style={{ color: "var(--charcoal-2)" }}>Loading…</p> : (
          <>
            {stats && (
              <div className={tStyles.statsGrid}>
                {[
                  { label: "Total Workspaces", value: stats.total_workspaces },
                  { label: "Active", value: stats.active_workspaces },
                  { label: "Suspended", value: stats.suspended_workspaces },
                  { label: "Total Users", value: stats.total_users },
                ].map(({ label, value }) => (
                  <div key={label} className={tStyles.statCard}>
                    <div className={tStyles.statLabel}>{label}</div>
                    <div className={tStyles.statValue}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className={tStyles.card}>
              <div className={tStyles.tableWrap}>
                <table className={tStyles.table}>
                  <thead>
                    <tr><th>Workspace</th><th>Slug</th><th>Users</th><th>Status</th><th>Created</th><th></th></tr>
                  </thead>
                  <tbody>
                    {workspaces.length === 0
                      ? <tr><td colSpan={6} className={tStyles.empty}>No workspaces registered</td></tr>
                      : workspaces.map(ws => (
                        <tr key={ws.workspace_id}>
                          <td style={{ fontWeight: 600 }}>{ws.workspace_name}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{ws.workspace_slug}</td>
                          <td>{ws.user_count ?? 0}</td>
                          <td>
                            <span className={`${tStyles.badge} ${ws.is_active ? tStyles.badgeGreen : tStyles.badgeRed}`}>
                              {ws.is_active ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td>{new Date(ws.created_at).toLocaleDateString()}</td>
                          <td>
                            <button className={tStyles.linkBtn} onClick={() => toggleSuspend(ws)}>
                              {ws.is_active ? "Suspend" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
