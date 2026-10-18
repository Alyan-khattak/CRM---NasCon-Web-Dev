"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, DollarSign } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Pipeline { pipeline_id: number; pipeline_name: string; }
interface Stage { stage_id: number; stage_name: string; is_active: boolean; }
interface Opportunity {
  opportunity_id: number;
  opportunity_name: string;
  pipeline_id: number;
  stage_id: number;
  value: number | null;
  status: string;
  contact_id: number | null;
  company_id: number | null;
  assigned_to: number | null;
  close_date: string | null;
  created_at: string;
}

const STATUS_CLASS: Record<string, string> = {
  open: "badgeBlue", won: "badgeGreen", lost: "badgeRed",
};

export default function OpportunitiesPage() {
  const router = useRouter();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stageMap, setStageMap] = useState<Record<number, Stage[]>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [moveModal, setMoveModal] = useState<Opportunity | null>(null);
  const [targetStageId, setTargetStageId] = useState("");
  const [form, setForm] = useState({
    opportunity_name: "", pipeline_id: "", stage_id: "", value: "", close_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadData();
  }, [router]);

  async function loadData() {
    try {
      const [os, ps] = await Promise.all([
        api.get<Opportunity[]>("/opportunities"),
        api.get<Pipeline[]>("/pipelines"),
      ]);
      setOpps(os);
      setPipelines(ps);
      const sm: Record<number, Stage[]> = {};
      // Stages are embedded in each pipeline from GET /pipelines
      (ps as unknown as Array<Pipeline & { stages?: Stage[] }>).forEach(p => {
        sm[p.pipeline_id] = p.stages || [];
      });
      setStageMap(sm);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const body: Record<string, string | number | null> = {
        opportunity_name: form.opportunity_name,
        pipeline_id: parseInt(form.pipeline_id),
        stage_id: parseInt(form.stage_id),
      };
      if (form.value) body.value = parseFloat(form.value);
      if (form.close_date) body.close_date = form.close_date;
      const o = await api.post<Opportunity>("/opportunities", body);
      setOpps(prev => [o, ...prev]);
      setModal(false);
      setForm({ opportunity_name: "", pipeline_id: "", stage_id: "", value: "", close_date: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleMoveStage(e: React.FormEvent) {
    e.preventDefault();
    if (!moveModal) return;
    setError(""); setSaving(true);
    try {
      const updated = await api.post<Opportunity>(
        `/opportunities/${moveModal.opportunity_id}/move-stage`,
        { target_stage_id: parseInt(targetStageId) }
      );
      setOpps(prev => prev.map(o => o.opportunity_id === updated.opportunity_id ? updated : o));
      setMoveModal(null); setTargetStageId("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  function getStageName(pipelineId: number, stageId: number) {
    return stageMap[pipelineId]?.find(s => s.stage_id === stageId)?.stage_name ?? `Stage ${stageId}`;
  }

  function getPipelineName(pipelineId: number) {
    return pipelines.find(p => p.pipeline_id === pipelineId)?.pipeline_name ?? `Pipeline ${pipelineId}`;
  }

  return (
    <PageShell
      title="Opportunities"
      action={
        <button className={tStyles.actionBtn} onClick={() => { setError(""); setModal(true); }}>
          <Plus size={14} /> New Opportunity
        </button>
      }
    >
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 460, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>New Opportunity</span>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleCreate}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Opportunity Name *</label>
                <input className={aStyles.input} placeholder="Enterprise Deal Q4" value={form.opportunity_name} onChange={e => setForm(f => ({ ...f, opportunity_name: e.target.value }))} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Pipeline *</label>
                <select
                  className={aStyles.input}
                  value={form.pipeline_id}
                  onChange={e => setForm(f => ({ ...f, pipeline_id: e.target.value, stage_id: "" }))}
                  required
                >
                  <option value="">Select pipeline…</option>
                  {pipelines.map(p => <option key={p.pipeline_id} value={p.pipeline_id}>{p.pipeline_name}</option>)}
                </select>
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Stage *</label>
                <select
                  className={aStyles.input}
                  value={form.stage_id}
                  onChange={e => setForm(f => ({ ...f, stage_id: e.target.value }))}
                  required
                  disabled={!form.pipeline_id}
                >
                  <option value="">Select stage…</option>
                  {(stageMap[parseInt(form.pipeline_id)] || []).map(s =>
                    <option key={s.stage_id} value={s.stage_id}>{s.stage_name}</option>
                  )}
                </select>
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Value (PKR)</label>
                <input className={aStyles.input} type="number" min="0" step="0.01" placeholder="0.00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Close Date</label>
                <input className={aStyles.input} type="date" value={form.close_date} onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))} />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Creating…" : "Create Opportunity"}</button>
            </form>
          </div>
        </div>
      )}

      {moveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 400, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>Move Stage</span>
              <button onClick={() => setMoveModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleMoveStage}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div style={{ fontSize: "0.875rem", color: "var(--charcoal-2)", marginBottom: "0.75rem" }}>
                Moving: <strong>{moveModal.opportunity_name}</strong>
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Target Stage</label>
                <select className={aStyles.input} value={targetStageId} onChange={e => setTargetStageId(e.target.value)} required>
                  <option value="">Select target stage…</option>
                  {(stageMap[moveModal.pipeline_id] || [])
                    .filter(s => s.stage_id !== moveModal.stage_id)
                    .map(s => <option key={s.stage_id} value={s.stage_id}>{s.stage_name}</option>)}
                </select>
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Moving…" : "Move to Stage"}</button>
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
                  <th>Opportunity</th>
                  <th>Pipeline</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Close Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {opps.length === 0 ? (
                  <tr><td colSpan={7} className={tStyles.empty}>No opportunities yet — create one above</td></tr>
                ) : opps.map(o => (
                  <tr key={o.opportunity_id}>
                    <td><strong>{o.opportunity_name}</strong></td>
                    <td>{getPipelineName(o.pipeline_id)}</td>
                    <td>{getStageName(o.pipeline_id, o.stage_id)}</td>
                    <td>
                      {o.value != null ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <DollarSign size={13} />PKR {o.value.toLocaleString()}
                        </span>
                      ) : <span style={{ opacity: 0.4 }}>Hidden</span>}
                    </td>
                    <td>
                      <span className={`${tStyles.badge} ${tStyles[STATUS_CLASS[o.status] as keyof typeof tStyles] ?? tStyles.badgeGray}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>{o.close_date ? new Date(o.close_date).toLocaleDateString() : "—"}</td>
                    <td style={{ display: "flex", gap: "0.4rem" }}>
                      <button className={tStyles.linkBtn} onClick={() => { setMoveModal(o); setError(""); }}>Move</button>
                      <button className={tStyles.linkBtn} onClick={() => router.push(`/opportunities/${o.opportunity_id}`)}>View</button>
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
