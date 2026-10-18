"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, DollarSign, Calendar, User, Target } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Pipeline { pipeline_id: number; pipeline_name: string; }
interface Stage { stage_id: number; stage_name: string; }
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

const STATUS_COLORS: Record<string, string> = { open: "badgeBlue", won: "badgeGreen", lost: "badgeRed" };

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const oppId = params?.id as string;
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stageMap, setStageMap] = useState<Record<number, Stage[]>>({});
  const [loading, setLoading] = useState(true);
  const [moveModal, setMoveModal] = useState(false);
  const [targetStageId, setTargetStageId] = useState("");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadAll();
  }, [router, oppId]);

  async function loadAll() {
    try {
      const [o, ps] = await Promise.all([
        api.get<Opportunity>(`/opportunities/${oppId}`),
        api.get<Pipeline[]>("/pipelines"),
      ]);
      setOpp(o);
      setPipelines(ps);
      const sm: Record<number, Stage[]> = {};
      // Stages are embedded in each pipeline from GET /pipelines
      (ps as unknown as Array<Pipeline & { stages?: Stage[] }>).forEach(p => {
        sm[p.pipeline_id] = p.stages || [];
      });
      setStageMap(sm);
    } catch { router.replace("/opportunities"); }
    finally { setLoading(false); }
  }

  async function handleMoveStage(e: React.FormEvent) {
    e.preventDefault(); setError(""); setActing(true);
    try {
      const updated = await api.post<Opportunity>(`/opportunities/${oppId}/move-stage`, { target_stage_id: parseInt(targetStageId) });
      setOpp(updated);
      setMoveModal(false); setTargetStageId("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setActing(false); }
  }

  async function handleMarkWon() {
    setActing(true); setError("");
    try {
      const updated = await api.patch<Opportunity>(`/opportunities/${oppId}`, { status: "won" });
      setOpp(updated);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setActing(false); }
  }

  async function handleMarkLost() {
    setActing(true); setError("");
    try {
      const updated = await api.patch<Opportunity>(`/opportunities/${oppId}`, { status: "lost" });
      setOpp(updated);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setActing(false); }
  }

  if (loading) return <PageShell title="Opportunity"><div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div></PageShell>;
  if (!opp) return null;

  const pipeline = pipelines.find(p => p.pipeline_id === opp.pipeline_id);
  const stages = stageMap[opp.pipeline_id] || [];
  const currentStage = stages.find(s => s.stage_id === opp.stage_id);

  return (
    <PageShell
      title={opp.opportunity_name}
      action={
        <button className={tStyles.linkBtn} onClick={() => router.push("/opportunities")} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <ArrowLeft size={14} /> Back to Opportunities
        </button>
      }
    >
      {moveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 400, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>Move to Stage</span>
              <button onClick={() => setMoveModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <form className={aStyles.form} onSubmit={handleMoveStage}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Target Stage</label>
                <select className={aStyles.input} value={targetStageId} onChange={e => setTargetStageId(e.target.value)} required>
                  <option value="">Select stage…</option>
                  {stages.filter(s => s.stage_id !== opp.stage_id).map(s =>
                    <option key={s.stage_id} value={s.stage_id}>{s.stage_name}</option>
                  )}
                </select>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--charcoal-2)" }}>Note: Required custom fields must be filled before moving.</p>
              <button className={aStyles.btn} disabled={acting}>{acting ? "Moving…" : "Move Stage"}</button>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        <div className={tStyles.card} style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--accent-sky)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={22} style={{ opacity: 0.5 }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontWeight: 700, fontSize: "1.15rem" }}>{opp.opportunity_name}</h2>
                <span className={`${tStyles.badge} ${tStyles[STATUS_COLORS[opp.status] as keyof typeof tStyles] ?? tStyles.badgeGray}`}>
                  {opp.status}
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--charcoal-2)" }}>Opportunity #{opp.opportunity_id}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              { label: "Pipeline", icon: null, value: pipeline?.pipeline_name ?? `Pipeline ${opp.pipeline_id}` },
              { label: "Stage", icon: null, value: currentStage?.stage_name ?? `Stage ${opp.stage_id}` },
              {
                label: "Value", icon: <DollarSign size={14} />,
                value: opp.value != null ? `PKR ${opp.value.toLocaleString()}` : <span style={{ opacity: 0.4 }}>Hidden (permission)</span>
              },
              {
                label: "Close Date", icon: <Calendar size={14} />,
                value: opp.close_date ? new Date(opp.close_date).toLocaleDateString() : "—"
              },
              {
                label: "Assigned To", icon: <User size={14} />,
                value: opp.assigned_to ? `User #${opp.assigned_to}` : "Unassigned"
              },
              {
                label: "Created", icon: null,
                value: new Date(opp.created_at).toLocaleDateString()
              },
            ].map(({ label, icon, value }) => (
              <div key={label}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
                  {icon && <span style={{ opacity: 0.45 }}>{icon}</span>}{value}
                </div>
              </div>
            ))}
          </div>

          {/* Stage Flow */}
          {stages.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.5rem" }}>Pipeline Stages</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                {stages.sort((a, b) => a.stage_id - b.stage_id).map((s, i) => (
                  <div key={s.stage_id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{
                      padding: "0.3rem 0.7rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: s.stage_id === opp.stage_id ? 700 : 500,
                      background: s.stage_id === opp.stage_id ? "var(--foreground)" : "var(--accent-sky)",
                      color: s.stage_id === opp.stage_id ? "#fff" : "var(--charcoal-2)",
                      border: "1px solid",
                      borderColor: s.stage_id === opp.stage_id ? "transparent" : "var(--border-color)",
                    }}>{s.stage_name}</span>
                    {i < stages.length - 1 && <span style={{ opacity: 0.3, fontSize: "0.8rem" }}>›</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={tStyles.card} style={{ padding: "1.25rem", height: "fit-content" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--charcoal-2)", marginBottom: "0.75rem" }}>Actions</div>
          {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 7, padding: "0.6rem 0.75rem", fontSize: "0.82rem", color: "#b91c1c", marginBottom: "0.5rem" }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {opp.status === "open" && (
              <>
                <button className={tStyles.actionBtn} onClick={() => { setError(""); setMoveModal(true); }} disabled={acting} style={{ width: "100%", justifyContent: "center" }}>
                  Move Stage
                </button>
                <button
                  className={tStyles.linkBtn}
                  onClick={handleMarkWon}
                  disabled={acting}
                  style={{ width: "100%", justifyContent: "center", display: "flex", borderColor: "#bbf7d0", color: "#15803d" }}
                >
                  Mark as Won ✓
                </button>
                <button
                  className={tStyles.linkBtn}
                  onClick={handleMarkLost}
                  disabled={acting}
                  style={{ width: "100%", justifyContent: "center", display: "flex", borderColor: "#fca5a5", color: "#b91c1c" }}
                >
                  Mark as Lost ✗
                </button>
              </>
            )}
            {opp.contact_id && (
              <button className={tStyles.linkBtn} onClick={() => router.push(`/contacts/${opp.contact_id}`)} style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                View Contact
              </button>
            )}
            {opp.company_id && (
              <button className={tStyles.linkBtn} onClick={() => router.push(`/companies/${opp.company_id}`)} style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                View Company
              </button>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
