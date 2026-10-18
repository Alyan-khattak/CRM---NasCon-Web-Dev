"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";

interface Lead {
  lead_id: number;
  status: number;
  source_type: number;
  assigned_to: number | null;
  escalation_level: number;
  created_at: string;
  acknowledged_at: string | null;
}

const STATUS: Record<number, [string, string]> = {
  1: ["New", "badgeGray"], 2: ["Assigned", "badgeBlue"], 3: ["Acknowledged", "badgeGreen"],
  4: ["Escalated", "badgeRed"], 5: ["Recovery", "badgeYellow"], 6: ["Converted", "badgeGreen"], 7: ["Closed", "badgeGray"],
};
const SOURCE: Record<number, string> = { 1: "Web Form", 2: "Incoming Msg", 3: "Manual" };

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    api.get<Lead[]>("/leads").then(setLeads).finally(() => setLoading(false));
  }, [router]);

  async function createManualLead() {
    setCreating(true);
    try {
      const lead = await api.post<Lead>("/leads", { source_type: 3 });
      setLeads(ls => [lead, ...ls]);
    } catch (_) { /* ignore */ } finally {
      setCreating(false);
    }
  }

  return (
    <PageShell
      title="Leads"
      action={
        <button className={tStyles.actionBtn} onClick={createManualLead} disabled={creating}>
          <Plus size={14} /> {creating ? "Creating…" : "New Lead"}
        </button>
      }
    >
      {loading ? (
        <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div>
      ) : (
        <div className={tStyles.card}>
          <div className={tStyles.tableWrap}>
            <table className={tStyles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Assigned To</th>
                  <th>Escalation</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={7} className={tStyles.empty}>No leads — create one above</td></tr>
                ) : leads.map(l => {
                  const [label, cls] = STATUS[l.status] ?? ["Unknown", "badgeGray"];
                  return (
                    <tr key={l.lead_id}>
                      <td>#{l.lead_id}</td>
                      <td><span className={`${tStyles.badge} ${tStyles[cls as keyof typeof tStyles]}`}>{label}</span></td>
                      <td>{SOURCE[l.source_type] ?? l.source_type}</td>
                      <td>{l.assigned_to ?? <span style={{ opacity: 0.45 }}>Unassigned</span>}</td>
                      <td>{l.escalation_level > 0 ? `Level ${l.escalation_level}` : "—"}</td>
                      <td>{new Date(l.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className={tStyles.linkBtn} onClick={() => router.push(`/leads/${l.lead_id}`)}>
                          View
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
    </PageShell>
  );
}
