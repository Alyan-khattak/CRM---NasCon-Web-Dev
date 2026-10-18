"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Shield, Key, CreditCard, X, Plus, Check } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface User {
  workspace_user_id: number;
  full_name: string;
  email: string;
  cell_no: string | null;
  role_id: number;
  availability_status: number;
  is_active: boolean;
}

interface Role {
  role_id: number;
  role_name: string;
  role_type: number;
  is_system_role: boolean;
}

const AVAILABILITY_LABELS: Record<number, [string, string]> = {
  1: ["Available", "badgeGreen"],
  2: ["Busy", "badgeYellow"],
  3: ["On Leave", "badgeYellow"],
  4: ["Offline", "badgeGray"],
};

type Tab = "users" | "roles" | "easypaisa";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "", password: "", role_id: "", cell_no: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [easypaisaNumber, setEasypaisaNumber] = useState("");
  const [easypaisaLoading, setEasypaisaLoading] = useState(false);
  const [easypaisaConfigured, setEasypaisaConfigured] = useState(false);
  const [easypaisaSaved, setEasypaisaSaved] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadUsers();
    loadRoles();
    loadEasypaisa();
  }, [router]);

  async function loadUsers() {
    try { setUsers(await api.get<User[]>("/workspaces/users")); }
    catch { /* unauthorized users see nothing */ }
    finally { setLoadingUsers(false); }
  }

  async function loadRoles() {
    try { setRoles(await api.get<Role[]>("/workspaces/roles")); }
    catch { /* ignore */ }
    finally { setLoadingRoles(false); }
  }

  async function loadEasypaisa() {
    try {
      const res = await api.get<{ easypaisa_number: string | null; configured: boolean }>("/payments/config/easypaisa");
      setEasypaisaNumber(res.easypaisa_number ?? "");
      setEasypaisaConfigured(res.configured);
    } catch { /* ignore */ }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const u = await api.post<User>("/workspaces/users", {
        full_name: inviteForm.full_name,
        email: inviteForm.email,
        password: inviteForm.password,
        role_id: parseInt(inviteForm.role_id),
        cell_no: inviteForm.cell_no || undefined,
      });
      setUsers(us => [...us, u]);
      setInviteModal(false);
      setInviteForm({ full_name: "", email: "", password: "", role_id: "", cell_no: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleUpdateAvailability(userId: number, availability_status: number) {
    try {
      const updated = await api.patch<User>(`/workspaces/users/${userId}`, { availability_status });
      setUsers(us => us.map(u => u.workspace_user_id === userId ? updated : u));
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleUpdateActive(userId: number, is_active: boolean) {
    try {
      const updated = await api.patch<User>(`/workspaces/users/${userId}`, { is_active });
      setUsers(us => us.map(u => u.workspace_user_id === userId ? updated : u));
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleSaveEasypaisa(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setEasypaisaSaved(false);
    try {
      await api.post("/payments/config/easypaisa", { account_number: easypaisaNumber });
      setEasypaisaConfigured(true); setEasypaisaSaved(true);
      setTimeout(() => setEasypaisaSaved(false), 3000);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  const TAB_STYLE = (t: Tab) => ({
    padding: "0.55rem 1.1rem",
    fontWeight: 600,
    fontSize: "0.875rem",
    border: "none",
    background: tab === t ? "var(--foreground)" : "transparent",
    color: tab === t ? "#fff" : "var(--charcoal-2)",
    borderRadius: 7,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  } as React.CSSProperties);

  return (
    <PageShell title="Settings">
      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem", background: "var(--accent-sky)", padding: "0.35rem", borderRadius: 10, width: "fit-content" }}>
        <button style={TAB_STYLE("users")} onClick={() => setTab("users")}><Users size={14} /> Team</button>
        <button style={TAB_STYLE("roles")} onClick={() => setTab("roles")}><Shield size={14} /> Roles</button>
        <button style={TAB_STYLE("easypaisa")} onClick={() => setTab("easypaisa")}><CreditCard size={14} /> Easypaisa</button>
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 440, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>Invite Team Member</span>
              <button onClick={() => setInviteModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleInvite}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Full Name *</label>
                <input className={aStyles.input} value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Email *</label>
                <input className={aStyles.input} type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Password *</label>
                <input className={aStyles.input} type="password" minLength={8} value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Role *</label>
                <select className={aStyles.input} value={inviteForm.role_id} onChange={e => setInviteForm(f => ({ ...f, role_id: e.target.value }))} required>
                  <option value="">Select role…</option>
                  {roles.filter(r => r.role_type !== 1).map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                </select>
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Phone (optional)</label>
                <input className={aStyles.input} value={inviteForm.cell_no} onChange={e => setInviteForm(f => ({ ...f, cell_no: e.target.value }))} />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Inviting…" : "Send Invite"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <p style={{ color: "var(--charcoal-2)", fontSize: "0.875rem" }}>Manage team members and their availability status.</p>
            <button className={tStyles.actionBtn} onClick={() => { setError(""); setInviteModal(true); }}>
              <Plus size={14} /> Invite Member
            </button>
          </div>
          {loadingUsers ? <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div> : (
            <div className={tStyles.card}>
              <div className={tStyles.tableWrap}>
                <table className={tStyles.table}>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Availability</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={7} className={tStyles.empty}>No team members found</td></tr>
                    ) : users.map(u => {
                      const [avLabel, avCls] = AVAILABILITY_LABELS[u.availability_status] ?? ["Unknown", "badgeGray"];
                      const roleName = roles.find(r => r.role_id === u.role_id)?.role_name ?? `Role ${u.role_id}`;
                      return (
                        <tr key={u.workspace_user_id}>
                          <td><strong>{u.full_name}</strong></td>
                          <td>{u.email}</td>
                          <td>{u.cell_no ?? "—"}</td>
                          <td>
                            <span className={`${tStyles.badge} ${tStyles.badgeGray}`}>{roleName}</span>
                          </td>
                          <td>
                            <select
                              value={u.availability_status}
                              onChange={e => handleUpdateAvailability(u.workspace_user_id, parseInt(e.target.value))}
                              style={{ border: "1px solid var(--border-color)", borderRadius: 6, padding: "0.3rem 0.5rem", fontSize: "0.82rem", fontFamily: "inherit", cursor: "pointer" }}
                            >
                              {Object.entries(AVAILABILITY_LABELS).map(([id, [label]]) => (
                                <option key={id} value={id}>{label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`${tStyles.badge} ${u.is_active ? tStyles.badgeGreen : tStyles.badgeRed}`}>
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <button className={tStyles.linkBtn} onClick={() => handleUpdateActive(u.workspace_user_id, !u.is_active)}>
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Roles Tab */}
      {tab === "roles" && (
        <>
          <p style={{ color: "var(--charcoal-2)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            System roles for this workspace. Owner can configure permissions per role via the API.
          </p>
          {loadingRoles ? <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div> : (
            <div className={tStyles.card}>
              <div className={tStyles.tableWrap}>
                <table className={tStyles.table}>
                  <thead>
                    <tr><th>Role Name</th><th>Type</th><th>System Role</th></tr>
                  </thead>
                  <tbody>
                    {roles.length === 0 ? (
                      <tr><td colSpan={3} className={tStyles.empty}>No roles found</td></tr>
                    ) : roles.map(r => (
                      <tr key={r.role_id}>
                        <td><strong>{r.role_name}</strong></td>
                        <td>
                          <span className={`${tStyles.badge} ${r.role_type === 1 ? tStyles.badgeRed : r.role_type === 2 ? tStyles.badgeYellow : tStyles.badgeBlue}`}>
                            {r.role_type === 1 ? "Owner" : r.role_type === 2 ? "Admin" : "User"}
                          </span>
                        </td>
                        <td>
                          {r.is_system_role ? <Check size={16} style={{ color: "#15803d" }} /> : <span style={{ opacity: 0.35 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Easypaisa Tab */}
      {tab === "easypaisa" && (
        <div style={{ maxWidth: 480 }}>
          <p style={{ color: "var(--charcoal-2)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            Configure your workspace Easypaisa account number. Customers will be instructed to send payments to this number.
          </p>
          <div className={tStyles.card} style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <CreditCard size={18} />
              <strong>Easypaisa Account</strong>
              <span className={`${tStyles.badge} ${easypaisaConfigured ? tStyles.badgeGreen : tStyles.badgeGray}`} style={{ marginLeft: "auto" }}>
                {easypaisaConfigured ? "Configured" : "Not Configured"}
              </span>
            </div>
            <form onSubmit={handleSaveEasypaisa} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--charcoal-2)", marginBottom: "0.4rem" }}>
                  Account Number
                </label>
                <input
                  style={{ width: "100%", border: "1px solid var(--border-color)", borderRadius: 7, padding: "0.55rem 0.75rem", fontSize: "0.9rem", fontFamily: "inherit" }}
                  placeholder="e.g. 03XX-XXXXXXX"
                  value={easypaisaNumber}
                  onChange={e => setEasypaisaNumber(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving || !easypaisaNumber}
                style={{
                  background: "var(--foreground)", color: "#fff", border: "none", borderRadius: 7,
                  padding: "0.6rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.4rem", alignSelf: "flex-start",
                }}
              >
                <Key size={14} /> {saving ? "Saving…" : "Save Account Number"}
              </button>
              {easypaisaSaved && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#15803d", fontSize: "0.875rem" }}>
                  <Check size={16} /> Saved successfully
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
