"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X, ExternalLink, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  html_link: string;
}

function fmt(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function CalendarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState<"connected" | "error" | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [attendees, setAttendees] = useState("");

  const load = useCallback(async () => {
    const status = await api.get<{ connected: boolean }>("/calendar/status");
    setConnected(status.connected);
    if (status.connected) {
      const evts = await api.get<CalendarEvent[]>("/calendar/events?days_ahead=30");
      setEvents(evts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    // Handle OAuth redirect back
    const conn = params.get("connected");
    const err = params.get("error");
    if (conn === "true") setBanner("connected");
    if (err) setBanner("error");
    load();
  }, [router, params, load]);

  async function handleConnect() {
    const res = await api.get<{ auth_url: string }>("/calendar/auth");
    window.location.href = res.auth_url;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const newEvt = await api.post<CalendarEvent>("/calendar/events", {
        title,
        start,
        end,
        description,
        attendees: attendees ? attendees.split(",").map(s => s.trim()).filter(Boolean) : [],
      });
      setEvents(prev => [newEvt, ...prev]);
      setModal(false);
      setTitle(""); setStart(""); setEnd(""); setDescription(""); setAttendees("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <PageShell
      title="Calendar"
      action={
        connected ? (
          <button className={tStyles.actionBtn} onClick={() => setModal(true)}>
            <Plus size={14} /> New Event
          </button>
        ) : undefined
      }
    >
      {banner === "connected" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", color: "#166534", fontSize: "0.9rem" }}>
          <CheckCircle size={16} /> Google Calendar connected successfully!
        </div>
      )}
      {banner === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", color: "#991b1b", fontSize: "0.9rem" }}>
          <AlertCircle size={16} /> Failed to connect Google Calendar. Try again.
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 460, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>New Calendar Event</span>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleCreate}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Title</label>
                <input className={aStyles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting with client" required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={aStyles.field}>
                  <label className={aStyles.label}>Start</label>
                  <input className={aStyles.input} type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
                </div>
                <div className={aStyles.field}>
                  <label className={aStyles.label}>End</label>
                  <input className={aStyles.input} type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
                </div>
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Description (optional)</label>
                <input className={aStyles.input} value={description} onChange={e => setDescription(e.target.value)} placeholder="Agenda, notes…" />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Attendees (comma-separated emails)</label>
                <input className={aStyles.input} value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="alice@example.com, bob@example.com" />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Creating…" : "Create Event"}</button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div>
      ) : !connected ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", gap: "1rem", textAlign: "center" }}>
          <Calendar size={48} strokeWidth={1} color="var(--charcoal-3)" />
          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>Connect Google Calendar</div>
          <div style={{ color: "var(--charcoal-2)", fontSize: "0.9rem", maxWidth: 360 }}>
            Link your Google account to view and create events directly from the CRM.
          </div>
          <button className={aStyles.btn} style={{ marginTop: "0.5rem" }} onClick={handleConnect}>
            Connect Google Calendar
          </button>
        </div>
      ) : (
        <div className={tStyles.card}>
          <div className={tStyles.tableWrap}>
            <table className={tStyles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Description</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={5} className={tStyles.empty}>No upcoming events in next 30 days</td></tr>
                ) : events.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 500 }}>{ev.title}</td>
                    <td style={{ fontSize: "0.85rem" }}>{fmt(ev.start)}</td>
                    <td style={{ fontSize: "0.85rem" }}>{fmt(ev.end)}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--charcoal-2)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.description || "—"}
                    </td>
                    <td>
                      {ev.html_link && (
                        <a href={ev.html_link} target="_blank" rel="noopener noreferrer" className={tStyles.linkBtn} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", textDecoration: "none" }}>
                          <ExternalLink size={12} /> Open
                        </a>
                      )}
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
