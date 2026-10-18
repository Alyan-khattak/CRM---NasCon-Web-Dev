"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, GitBranch, Settings, Trash2, ArrowRight } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Stage { stage_id: number; pipeline_id: number; stage_name: string; sort_order: number; is_active: boolean; }
interface Pipeline { pipeline_id: number; pipeline_name: string; created_at: string; stages: Stage[]; }

export default function PipelinesPage() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Record<number, Stage[]>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"pipeline" | "stage" | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [pipelineName, setPipelineName] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageOrder, setStageOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadPipelines();
  }, [router]);

  async function loadPipelines() {
    try {
      const ps = await api.get<Pipeline[]>("/pipelines");
      setPipelines(ps);
      // Stages are embedded in each pipeline response
      const stageMap: Record<number, Stage[]> = {};
      ps.forEach(p => { stageMap[p.pipeline_id] = p.stages || []; });
      setStages(stageMap);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function handleCreatePipeline(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const p = await api.post<Pipeline>("/pipelines", { pipeline_name: pipelineName });
      setPipelines(ps => [...ps, p]);
      setStages(s => ({ ...s, [p.pipeline_id]: [] }));
      setModal(null); setPipelineName("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleAddStage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPipeline) return;
    setError(""); setSaving(true);
    try {
      const s = await api.post<Stage>(`/pipelines/${selectedPipeline.pipeline_id}/stages`, {
        stage_name: stageName,
        sort_order: parseInt(stageOrder),
      });
      setStages(prev => ({
        ...prev,
        [selectedPipeline.pipeline_id]: [...(prev[selectedPipeline.pipeline_id] || []), s].sort((a, b) => a.sort_order - b.sort_order),
      }));
      setModal(null); setStageName(""); setStageOrder("0");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDeleteStage(pipelineId: number, stageId: number) {
    if (!confirm("Move all opportunities out of this stage before deleting. Continue?")) return;
    try {
      await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
      setStages(prev => ({
        ...prev,
        [pipelineId]: (prev[pipelineId] || []).filter(s => s.stage_id !== stageId),
      }));
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Delete failed"); }
  }

  return (
    <PageShell
      title="Pipelines"
      action={
        <button className={tStyles.actionBtn} onClick={() => { setError(""); setModal("pipeline"); }}>
          <Plus size={14} /> New Pipeline
        </button>
      }
    >
      {modal === "pipeline" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className={aStyles.card} style={{ maxWidth: 400, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>New Pipeline</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleCreatePipeline}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Pipeline Name</label>
                <input className={aStyles.input} placeholder="Sales Pipeline" value={pipelineName} onChange={e => setPipelineName(e.target.value)} required />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Creating…" : "Create Pipeline"}</button>
            </form>
          </div>
        </div>
      )}

      {modal === "stage" && selectedPipeline && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className={aStyles.card} style={{ maxWidth: 400, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>Add Stage to {selectedPipeline.pipeline_name}</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleAddStage}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Stage Name</label>
                <input className={aStyles.input} placeholder="Qualified, Proposal, Negotiation…" value={stageName} onChange={e => setStageName(e.target.value)} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Sort Order</label>
                <input className={aStyles.input} type="number" min="0" value={stageOrder} onChange={e => setStageOrder(e.target.value)} required />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Adding…" : "Add Stage"}</button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div>
      ) : pipelines.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--charcoal-2)" }}>
          <GitBranch size={40} style={{ opacity: 0.25, marginBottom: "1rem" }} />
          <p>No pipelines yet. Create your first pipeline to start managing opportunities.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {pipelines.map(p => {
            const pipelineStages = (stages[p.pipeline_id] || []).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={p.pipeline_id} className={tStyles.card} style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <GitBranch size={18} style={{ opacity: 0.55 }} />
                    <strong style={{ fontSize: "1rem" }}>{p.pipeline_name}</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--charcoal-2)" }}>
                      {pipelineStages.length} stage{pipelineStages.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    className={tStyles.linkBtn}
                    style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
                    onClick={() => { setSelectedPipeline(p); setError(""); setModal("stage"); }}
                  >
                    <Settings size={13} /> Add Stage
                  </button>
                </div>

                {pipelineStages.length === 0 ? (
                  <div style={{ color: "var(--charcoal-2)", fontSize: "0.875rem", padding: "0.75rem 0" }}>
                    No stages yet — add your first stage.
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    {pipelineStages.map((s, i) => (
                      <div key={s.stage_id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: "0.4rem",
                          background: "var(--accent-sky)", border: "1px solid var(--border-color)",
                          borderRadius: 7, padding: "0.35rem 0.75rem", fontSize: "0.85rem", fontWeight: 500,
                        }}>
                          <span>{s.stage_name}</span>
                          <button
                            onClick={() => handleDeleteStage(p.pipeline_id, s.stage_id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--charcoal-2)", display: "flex", alignItems: "center", padding: 0 }}
                            title="Delete stage"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {i < pipelineStages.length - 1 && <ArrowRight size={14} style={{ opacity: 0.35 }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
