"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, UserCheck, AlertTriangle, ChevronDown, PhoneCall, Zap } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Lead {
  lead_id: number;
  workspace_id: number;
  contact_id: number | null;
  opportunity_id: number | null;
  source_type: number;
  status: number;
  assigned_to: number | null;
  assigned_at: string | null;
  acknowledged_at: string | null;
  escalation_level: number;
  reassignment_reason: string | null;
  ack_timer_remaining_seconds: number | null;
  created_at: string;
}

interface CallLog {
  call_log_id: number;
  direction: string;
  status: string;
  duration_seconds: number | null;
  summary: string | null;
}

const STATUS_LABEL: Record<number, string> = {
  1: "New", 2: "Assigned", 3: "Acknowledged", 4: "Escalated", 5: "Recovery Queue", 6: "Converted", 7: "Closed",
};
const STATUS_CLASS: Record<number, string> = {
  1: "badgeGray", 2: "badgeBlue", 3: "badgeGreen", 4: "badgeRed", 5: "badgeYellow", 6: "badgeGreen", 7: "badgeGray",
};
const SOURCE_LABEL: Record<number, string> = { 1: "Web Form", 2: "Incoming Message", 3: "Manual" };

function formatTimer(secs: number | null) {
  if (secs === null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s remaining`;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignForm, setReassignForm] = useState({ new_assignee_id: "", reason: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadLead();
  }, [router, leadId]);

  async function loadLead() {
    try {
      const [l, cs] = await Promise.all([
        api.get<Lead>(`/leads/${leadId}`),
        api.get<CallLog[]>(`/calls?lead_id=${leadId}`).catch(() => [] as CallLog[]),
      ]);
      setLead(l);
      setCalls(cs);
    } catch { router.replace("/leads"); }
    finally { setLoading(false); }
  }

  async function handleAcknowledge() {
    setActing(true);
    try {
      const updated = await api.post<Lead>(`/leads/${leadId}/acknowledge`);
      setLead(updated);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setActing(false); }
  }

  async function handleEscalate() {
    if (!confirm("Manually escalate this lead?")) return;
    setActing(true);
    try {
      const updated = await api.post<Lead>(`/leads/${leadId}/escalate`);
      setLead(updated);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setActing(false); }
  }

  async function handleReassign(e: React.FormEvent) {
    e.preventDefault(); setError(""); setActing(true);
    try {
      const updated = await api.post<Lead>(`/leads/${leadId}/reassign`, {
        new_assignee_id: parseInt(reassignForm.new_assignee_id),
        reason: reassignForm.reason,
      });
      setLead(updated);
      setReassignModal(false);
      setReassignForm({ new_assignee_id: "", reason: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setActing(false); }
  }

  if (loading) return <PageShell title="Lead"><div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div></PageShell>;
  if (!lead) return null;

  const timer = formatTimer(lead.ack_timer_remaining_seconds);

  return (
    <PageShell
      title={`Lead #${lead.lead_id}`}
      action={
        <button className={tStyles.linkBtn} onClick={() => router.push("/leads")} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <ArrowLeft size={14} /> Back to Leads
        </button>
      }
    >
      {reassignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 420, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>Reassign Lead</span>
              <button onClick={() => setReassignModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <form className={aStyles.form} onSubmit={handleReassign}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>New Assignee User ID</label>
                <input className={aStyles.input} type="number" placeholder="User ID" value={reassignForm.new_assignee_id} onChange={e => setReassignForm(f => ({ ...f, new_assignee_id: e.target.value }))} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Reason</label>
                <input className={aStyles.input} placeholder="Reason for reassignment" value={reassignForm.reason} onChange={e => setReassignForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              <button className={aStyles.btn} disabled={acting}>{acting ? "Reassigning…" : "Reassign"}</button>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        {/* Main Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className={tStyles.card} style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
                  <Zap size={18} />
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Lead #{lead.lead_id}</h2>
                  <span className={`${tStyles.badge} ${tStyles[STATUS_CLASS[lead.status] as keyof typeof tStyles]}`}>
                    {STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--charcoal-2)" }}>
                  Source: {SOURCE_LABEL[lead.source_type] ?? lead.source_type} · Created {new Date(lead.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Ack Timer */}
            {timer && (
              <div style={{ background: "#fef9c3", border: "1px solid #fef08a", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                <Clock size={15} style={{ color: "#a16207" }} />
                <strong style={{ color: "#a16207" }}>Acknowledgement window: {timer}</strong>
              </div>
            )}

            {lead.ack_timer_remaining_seconds !== null && lead.ack_timer_remaining_seconds <= 0 && lead.status === 2 && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                <AlertTriangle size={15} style={{ color: "#b91c1c" }} />
                <strong style={{ color: "#b91c1c" }}>Acknowledgement window expired — lead may escalate</strong>
              </div>
            )}

            {/* Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { label: "Assigned To", value: lead.assigned_to ? `User #${lead.assigned_to}` : "Unassigned" },
                { label: "Assigned At", value: lead.assigned_at ? new Date(lead.assigned_at).toLocaleString() : "—" },
                { label: "Acknowledged At", value: lead.acknowledged_at ? new Date(lead.acknowledged_at).toLocaleString() : "Not acknowledged" },
                { label: "Escalation Level", value: lead.escalation_level > 0 ? `Level ${lead.escalation_level}` : "None" },
                { label: "Contact", value: lead.contact_id ? `Contact #${lead.contact_id}` : "—" },
                { label: "Opportunity", value: lead.opportunity_id ? `Opp #${lead.opportunity_id}` : "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.2rem" }}>{label}</div>
                  <div style={{ fontSize: "0.9rem" }}>{value}</div>
                </div>
              ))}
            </div>

            {lead.reassignment_reason && (
              <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "var(--accent-ice)", borderRadius: 8, fontSize: "0.875rem" }}>
                <strong>Reassignment reason:</strong> {lead.reassignment_reason}
              </div>
            )}
          </div>

          {/* Call Logs */}
          {calls.length > 0 && (
            <div className={tStyles.card} style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <PhoneCall size={16} />
                <strong>Call Logs</strong>
              </div>
              <div className={tStyles.tableWrap}>
                <table className={tStyles.table}>
                  <thead><tr><th>ID</th><th>Direction</th><th>Status</th><th>Duration</th><th>Summary</th></tr></thead>
                  <tbody>
                    {calls.map(c => (
                      <tr key={c.call_log_id}>
                        <td>#{c.call_log_id}</td>
                        <td>{c.direction}</td>
                        <td><span className={`${tStyles.badge} ${tStyles.badgeBlue}`}>{c.status}</span></td>
                        <td>{c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : "—"}</td>
                        <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.summary ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Actions Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className={tStyles.card} style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--charcoal-2)", marginBottom: "0.75rem" }}>Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {lead.status === 2 && (
                <button
                  className={tStyles.actionBtn}
                  onClick={handleAcknowledge}
                  disabled={acting}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <UserCheck size={14} /> Acknowledge Lead
                </button>
              )}
              <button
                className={tStyles.linkBtn}
                onClick={() => { setError(""); setReassignModal(true); }}
                style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                Reassign Lead
              </button>
              <button
                className={tStyles.linkBtn}
                onClick={handleEscalate}
                disabled={acting}
                style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.4rem", borderColor: "#fca5a5", color: "#b91c1c" }}
              >
                <AlertTriangle size={14} /> Escalate Lead
              </button>
              {lead.contact_id && (
                <button className={tStyles.linkBtn} onClick={() => router.push(`/contacts/${lead.contact_id}`)} style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  View Contact
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
