"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneCall, PhoneIncoming } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface CallLog {
  call_log_id: number;
  lead_id: number | null;
  contact_id: number | null;
  retell_call_id: string | null;
  direction: string;
  status: string;
  duration_seconds: number | null;
  summary: string | null;
  initiated_by: number;
}

const STATUS_CLASS: Record<string, string> = {
  initiated: "badgeBlue", completed: "badgeGreen", failed: "badgeRed", no_answer: "badgeYellow",
};

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ to_number: "", lead_id: "", contact_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    api.get<CallLog[]>("/calls").then(setCalls).finally(() => setLoading(false));
  }, [router]);

  async function handleTriggerCall(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const body: Record<string, string | number | undefined> = { to_number: form.to_number };
      if (form.lead_id) body.lead_id = parseInt(form.lead_id);
      if (form.contact_id) body.contact_id = parseInt(form.contact_id);
      const c = await api.post<CallLog>("/calls", body);
      setCalls(cs => [c, ...cs]);
      setModal(false);
      setForm({ to_number: "", lead_id: "", contact_id: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <PageShell
      title="Calls"
      action={
        <button className={tStyles.actionBtn} onClick={() => { setError(""); setModal(true); }}>
          <PhoneCall size={14} /> Trigger Call
        </button>
      }
    >
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 420, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>Initiate Call</span>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <form className={aStyles.form} onSubmit={handleTriggerCall}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Phone Number *</label>
                <input className={aStyles.input} placeholder="+92 300 0000000" value={form.to_number} onChange={e => setForm(f => ({ ...f, to_number: e.target.value }))} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Lead ID (optional)</label>
                <input className={aStyles.input} type="number" placeholder="Lead ID" value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Contact ID (optional)</label>
                <input className={aStyles.input} type="number" placeholder="Contact ID" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Initiating…" : "Start Call"}</button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div>
      ) : (
        <div className={tStyles.card}>
          <div className={tStyles.tableWrap}>
            <table className={tStyles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 ? (
                  <tr><td colSpan={7} className={tStyles.empty}>No calls logged yet</td></tr>
                ) : calls.map(c => (
                  <tr key={c.call_log_id}>
                    <td>#{c.call_log_id}</td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        {c.direction === "outbound" ? <PhoneCall size={13} /> : <PhoneIncoming size={13} />}
                        {c.direction}
                      </span>
                    </td>
                    <td>
                      <span className={`${tStyles.badge} ${tStyles[STATUS_CLASS[c.status] as keyof typeof tStyles] ?? tStyles.badgeGray}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{formatDuration(c.duration_seconds)}</td>
                    <td>{c.lead_id ? (
                      <button className={tStyles.linkBtn} onClick={() => router.push(`/leads/${c.lead_id}`)}>Lead #{c.lead_id}</button>
                    ) : "—"}</td>
                    <td>{c.contact_id ? (
                      <button className={tStyles.linkBtn} onClick={() => router.push(`/contacts/${c.contact_id}`)}>Contact #{c.contact_id}</button>
                    ) : "—"}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.summary ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
