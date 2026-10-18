"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Filter, ChevronDown } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";

interface AuditLog {
  audit_log_id: number;
  event_type: string;
  actor_id: number | null;
  actor_type: string;
  entity_type: string;
  entity_id: number;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  occurred_at: string;
  remarks: string | null;
}

const EVENT_COLORS: Record<string, string> = {
  CONTACT_CREATED: "badgeGreen", CONTACT_UPDATED: "badgeBlue", CONTACT_DELETED: "badgeRed",
  OPPORTUNITY_CREATED: "badgeGreen", OPPORTUNITY_UPDATED: "badgeBlue", OPPORTUNITY_DELETED: "badgeRed",
  OPPORTUNITY_STAGE_MOVED: "badgeYellow",
  PIPELINE_CREATED: "badgeGreen", STAGE_DELETED: "badgeRed",
  USER_INVITED: "badgeGreen", USER_UPDATED: "badgeBlue",
  LEAD_REASSIGNED: "badgeYellow", LEAD_ESCALATED: "badgeRed",
  PERMISSION_CHANGED: "badgeYellow",
  CUSTOM_FIELD_CREATED: "badgeGreen",
};

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadLogs();
  }, [router]);

  async function loadLogs() {
    setLoading(true);
    try {
      let url = "/audit?limit=100";
      if (eventTypeFilter) url += `&event_type=${encodeURIComponent(eventTypeFilter)}`;
      if (entityTypeFilter) url += `&entity_type=${encodeURIComponent(entityTypeFilter)}`;
      const data = await api.get<AuditLog[]>(url);
      setLogs(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    loadLogs();
  }

  return (
    <PageShell title="Audit Log">
      <div style={{ marginBottom: "1rem" }}>
        <form onSubmit={applyFilters} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>
              Event Type
            </label>
            <input
              style={{ border: "1px solid var(--border-color)", borderRadius: 7, padding: "0.45rem 0.75rem", fontSize: "0.875rem", fontFamily: "inherit", minWidth: 180 }}
              placeholder="e.g. CONTACT_CREATED"
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>
              Entity Type
            </label>
            <input
              style={{ border: "1px solid var(--border-color)", borderRadius: 7, padding: "0.45rem 0.75rem", fontSize: "0.875rem", fontFamily: "inherit", minWidth: 160 }}
              placeholder="e.g. contact"
              value={entityTypeFilter}
              onChange={e => setEntityTypeFilter(e.target.value)}
            />
          </div>
          <button type="submit" style={{
            background: "var(--foreground)", color: "#fff", border: "none", borderRadius: 7,
            padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.4rem",
          }}>
            <Filter size={14} /> Apply
          </button>
          {(eventTypeFilter || entityTypeFilter) && (
            <button type="button" onClick={() => { setEventTypeFilter(""); setEntityTypeFilter(""); setTimeout(loadLogs, 0); }}
              style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: 7, padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>
              Clear
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div>
      ) : (
        <div className={tStyles.card}>
          <div className={tStyles.tableWrap}>
            <table className={tStyles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Actor</th>
                  <th>Actor Type</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={tStyles.empty}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                        <Shield size={32} style={{ opacity: 0.2 }} />
                        No audit entries match the current filters
                      </div>
                    </td>
                  </tr>
                ) : logs.map(l => (
                  <>
                    <tr key={l.audit_log_id} style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === l.audit_log_id ? null : l.audit_log_id)}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(l.occurred_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`${tStyles.badge} ${tStyles[EVENT_COLORS[l.event_type] as keyof typeof tStyles] ?? tStyles.badgeGray}`} style={{ fontSize: "0.7rem" }}>
                          {l.event_type}
                        </span>
                      </td>
                      <td>{l.entity_type}</td>
                      <td>#{l.entity_id}</td>
                      <td>{l.actor_id ? `User #${l.actor_id}` : "—"}</td>
                      <td><span style={{ textTransform: "capitalize" }}>{l.actor_type}</span></td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--charcoal-2)" }}>
                          {(l.before_value || l.after_value) ? "View" : "—"}
                          {(l.before_value || l.after_value) && <ChevronDown size={12} style={{ transform: expanded === l.audit_log_id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />}
                        </span>
                      </td>
                    </tr>
                    {expanded === l.audit_log_id && (
                      <tr key={`${l.audit_log_id}-detail`}>
                        <td colSpan={7} style={{ background: "var(--accent-ice)", padding: "0.75rem 1rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.82rem" }}>
                            {l.before_value && (
                              <div>
                                <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--charcoal-2)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em" }}>Before</div>
                                <pre style={{ margin: 0, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                  {JSON.stringify(l.before_value, null, 2)}
                                </pre>
                              </div>
                            )}
                            {l.after_value && (
                              <div>
                                <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--charcoal-2)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em" }}>After</div>
                                <pre style={{ margin: 0, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                  {JSON.stringify(l.after_value, null, 2)}
                                </pre>
                              </div>
                            )}
                            {l.remarks && (
                              <div style={{ gridColumn: "1 / -1" }}>
                                <span style={{ fontWeight: 600 }}>Remarks:</span> {l.remarks}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
