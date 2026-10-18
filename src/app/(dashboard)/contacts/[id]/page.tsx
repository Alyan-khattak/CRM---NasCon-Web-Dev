"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, Building2, MessageSquare } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";

interface Contact {
  contact_id: number;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_id: number | null;
  is_opted_out: boolean;
  created_at: string;
}

interface Opportunity {
  opportunity_id: number;
  opportunity_name: string;
  status: string;
  value: number | null;
}

interface Payment {
  payment_link_id: number;
  stripe_session_id: string;
  amount: number;
  currency: string;
  status: string;
}

interface CallLog {
  call_log_id: number;
  direction: string;
  status: string;
  duration_seconds: number | null;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params?.id as string;
  const [contact, setContact] = useState<Contact | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOptout, setUpdatingOptout] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadAll();
  }, [router, contactId]);

  async function loadAll() {
    try {
      const [c, os, ps, cs] = await Promise.allSettled([
        api.get<Contact>(`/contacts/${contactId}`),
        api.get<Opportunity[]>(`/opportunities?contact_id=${contactId}`).catch(() => [] as Opportunity[]),
        api.get<Payment[]>(`/payments?contact_id=${contactId}`).catch(() => [] as Payment[]),
        api.get<CallLog[]>(`/calls?contact_id=${contactId}`).catch(() => [] as CallLog[]),
      ]);
      if (c.status === "fulfilled") setContact(c.value);
      else router.replace("/contacts");
      if (os.status === "fulfilled") setOpps(os.value);
      if (ps.status === "fulfilled") setPayments(ps.value);
      if (cs.status === "fulfilled") setCalls(cs.value);
    } finally { setLoading(false); }
  }

  async function toggleOptOut() {
    if (!contact) return;
    setUpdatingOptout(true);
    try {
      const updated = await api.patch<Contact>(`/contacts/${contactId}`, { is_opted_out: !contact.is_opted_out });
      setContact(updated);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setUpdatingOptout(false); }
  }

  if (loading) return <PageShell title="Contact"><div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div></PageShell>;
  if (!contact) return null;

  return (
    <PageShell
      title={`${contact.first_name}${contact.last_name ? " " + contact.last_name : ""}`}
      action={
        <button className={tStyles.linkBtn} onClick={() => router.push("/contacts")} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <ArrowLeft size={14} /> Back to Contacts
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        {/* Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className={tStyles.card} style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent-sky)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={22} style={{ opacity: 0.5 }} />
              </div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "1.15rem" }}>{contact.first_name} {contact.last_name}</h2>
                <p style={{ fontSize: "0.82rem", color: "var(--charcoal-2)" }}>Contact #{contact.contact_id}</p>
              </div>
              {contact.is_opted_out && (
                <span className={`${tStyles.badge} ${tStyles.badgeRed}`} style={{ marginLeft: "auto" }}>
                  Opted Out
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>Email</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
                  <Mail size={14} style={{ opacity: 0.45 }} />{contact.email ?? "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>Phone</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
                  <Phone size={14} style={{ opacity: 0.45 }} />{contact.phone ?? "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>Company</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
                  <Building2 size={14} style={{ opacity: 0.45 }} />
                  {contact.company_id ? (
                    <button className={tStyles.linkBtn} onClick={() => router.push(`/companies/${contact.company_id}`)} style={{ padding: "0.2rem 0.5rem" }}>
                      Company #{contact.company_id}
                    </button>
                  ) : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>Added</div>
                <div style={{ fontSize: "0.9rem" }}>{new Date(contact.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {contact.is_opted_out && (
              <div style={{ marginTop: "1rem", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageSquare size={14} style={{ color: "#b91c1c" }} />
                <strong style={{ color: "#b91c1c" }}>This contact has opted out — messaging is blocked.</strong>
              </div>
            )}
          </div>

          {/* Opportunities */}
          {opps.length > 0 && (
            <div className={tStyles.card} style={{ padding: "1.25rem" }}>
              <strong style={{ display: "block", marginBottom: "0.75rem" }}>Opportunities ({opps.length})</strong>
              <div className={tStyles.tableWrap}>
                <table className={tStyles.table}>
                  <thead><tr><th>Name</th><th>Status</th><th>Value</th></tr></thead>
                  <tbody>
                    {opps.map(o => (
                      <tr key={o.opportunity_id} style={{ cursor: "pointer" }} onClick={() => router.push(`/opportunities/${o.opportunity_id}`)}>
                        <td>{o.opportunity_name}</td>
                        <td><span className={`${tStyles.badge} ${tStyles.badgeBlue}`}>{o.status}</span></td>
                        <td>{o.value != null ? `PKR ${o.value.toLocaleString()}` : <span style={{ opacity: 0.4 }}>Hidden</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <div className={tStyles.card} style={{ padding: "1.25rem" }}>
              <strong style={{ display: "block", marginBottom: "0.75rem" }}>Payments ({payments.length})</strong>
              <div className={tStyles.tableWrap}>
                <table className={tStyles.table}>
                  <thead><tr><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.payment_link_id}>
                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.stripe_session_id}</td>
                        <td>{p.currency} {p.amount.toLocaleString()}</td>
                        <td><span className={`${tStyles.badge} ${p.status === "paid" ? tStyles.badgeGreen : tStyles.badgeYellow}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Call Logs */}
          {calls.length > 0 && (
            <div className={tStyles.card} style={{ padding: "1.25rem" }}>
              <strong style={{ display: "block", marginBottom: "0.75rem" }}>Call Logs ({calls.length})</strong>
              <div className={tStyles.tableWrap}>
                <table className={tStyles.table}>
                  <thead><tr><th>ID</th><th>Direction</th><th>Status</th><th>Duration</th></tr></thead>
                  <tbody>
                    {calls.map(c => (
                      <tr key={c.call_log_id}>
                        <td>#{c.call_log_id}</td>
                        <td>{c.direction}</td>
                        <td><span className={`${tStyles.badge} ${tStyles.badgeBlue}`}>{c.status}</span></td>
                        <td>{c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className={tStyles.card} style={{ padding: "1.25rem", height: "fit-content" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--charcoal-2)", marginBottom: "0.75rem" }}>Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <button
              className={tStyles.linkBtn}
              onClick={toggleOptOut}
              disabled={updatingOptout}
              style={{ width: "100%", justifyContent: "center", display: "flex", ...(contact.is_opted_out ? {} : { borderColor: "#fca5a5", color: "#b91c1c" }) }}
            >
              {updatingOptout ? "Updating…" : contact.is_opted_out ? "Re-enable Messaging" : "Mark as Opted Out"}
            </button>
            <button
              className={tStyles.linkBtn}
              onClick={() => router.push(`/calls`)}
              style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Phone size={14} /> Log a Call
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
