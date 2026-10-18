"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Payment { payment_link_id: number; stripe_session_id: string; stripe_payment_intent_id: string | null; amount: number; currency: string; status: string; contact_id: number | null; }

const STATUS_CLASS: Record<string, string> = { pending: "badgeYellow", paid: "badgeGreen", abandoned: "badgeGray" };

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "confirm" | null>(null);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [amount, setAmount] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [createResult, setCreateResult] = useState<{ instructions: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    api.get<Payment[]>("/payments").then(setPayments).finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const res = await api.post<{ payment: Payment; instructions: string }>("/payments", { amount: parseFloat(amount) });
      setPayments(ps => [res.payment, ...ps]);
      setCreateResult(res);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return; setError(""); setSaving(true);
    try {
      const updated = await api.post<Payment>(`/payments/${selected.payment_link_id}/confirm`, { easypaisa_txn_ref: txnRef });
      setPayments(ps => ps.map(p => p.payment_link_id === updated.payment_link_id ? updated : p));
      setModal(null); setTxnRef("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <PageShell title="Payments" action={<button className={tStyles.actionBtn} onClick={() => { setCreateResult(null); setModal("create"); }}><Plus size={14} /> New Request</button>}>
      {modal === "create" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 420, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>New Payment Request</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {createResult ? (
              <div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "1rem", marginBottom: "1rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {createResult.instructions}
                </div>
                <button className={aStyles.btn} onClick={() => setModal(null)}>Done</button>
              </div>
            ) : (
              <form className={aStyles.form} onSubmit={handleCreate}>
                {error && <div className={aStyles.error}>{error}</div>}
                <div className={aStyles.field}>
                  <label className={aStyles.label}>Amount (PKR)</label>
                  <input className={aStyles.input} type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <button className={aStyles.btn} disabled={saving}>{saving ? "Creating…" : "Create Request"}</button>
              </form>
            )}
          </div>
        </div>
      )}
      {modal === "confirm" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 400, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>Confirm Payment</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleConfirm}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "var(--charcoal-2)" }}>Ref: {selected.stripe_session_id} — PKR {selected.amount}</div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Easypaisa Transaction Reference</label>
                <input className={aStyles.input} placeholder="e.g. EP-TXN-123456" value={txnRef} onChange={e => setTxnRef(e.target.value)} required />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Confirming…" : "Mark as Paid"}</button>
            </form>
          </div>
        </div>
      )}
      {loading ? <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div> : (
        <div className={tStyles.card}>
          <div className={tStyles.tableWrap}>
            <table className={tStyles.table}>
              <thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>Txn Ref</th><th></th></tr></thead>
              <tbody>
                {payments.length === 0
                  ? <tr><td colSpan={5} className={tStyles.empty}>No payment requests yet</td></tr>
                  : payments.map(p => (
                    <tr key={p.payment_link_id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.stripe_session_id}</td>
                      <td>PKR {p.amount.toLocaleString()}</td>
                      <td><span className={`${tStyles.badge} ${tStyles[STATUS_CLASS[p.status] as keyof typeof tStyles] ?? tStyles.badgeGray}`}>{p.status}</span></td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.stripe_payment_intent_id ?? "—"}</td>
                      <td>
                        {p.status === "pending" && (
                          <button className={tStyles.linkBtn} onClick={() => { setSelected(p); setError(""); setTxnRef(""); setModal("confirm"); }}>Confirm</button>
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
