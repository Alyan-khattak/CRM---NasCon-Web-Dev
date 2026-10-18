"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ExternalLink } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Payment {
  payment_link_id: number;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: string;
  contact_id: number | null;
  checkout_url?: string | null;
}

const STATUS_CLASS: Record<string, string> = {
  pending: "badgeYellow",
  paid: "badgeGreen",
  expired: "badgeGray",
  abandoned: "badgeGray",
  failed: "badgeRed",
  refunded: "badgeGray",
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("CRM Payment");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState<Payment | null>(null);
  // Track checkout URLs for payments created this session (not stored in list response)
  const [sessionUrls, setSessionUrls] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    api.get<Payment[]>("/payments").then(setPayments).finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const res = await api.post<Payment>("/payments", {
        amount: parseFloat(amount),
        description,
      });
      setPayments(ps => [res, ...ps]);
      setNewPayment(res);
      setCheckoutUrl(res.checkout_url ?? null);
      if (res.checkout_url) {
        setSessionUrls(prev => ({ ...prev, [res.payment_link_id]: res.checkout_url! }));
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  function closeModal() {
    setModal(null);
    setAmount("");
    setDescription("CRM Payment");
    setCheckoutUrl(null);
    setNewPayment(null);
    setError("");
  }

  return (
    <PageShell
      title="Payments"
      action={
        <button className={tStyles.actionBtn} onClick={() => { closeModal(); setModal("create"); }}>
          <Plus size={14} /> New Request
        </button>
      }
    >
      {modal === "create" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 440, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>New Payment Request</span>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>

            {checkoutUrl && newPayment ? (
              <div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "1rem", marginBottom: "1.25rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "#166534" }}>Payment request created!</div>
                  <div style={{ fontSize: "0.88rem", color: "#15803d" }}>
                    Amount: <strong>${newPayment.amount.toLocaleString()} {newPayment.currency}</strong>
                  </div>
                </div>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={aStyles.btn}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", textDecoration: "none", marginBottom: "0.75rem" }}
                >
                  <ExternalLink size={15} /> Open Stripe Checkout
                </a>
                <div style={{ fontSize: "0.78rem", color: "var(--charcoal-2)", marginBottom: "1rem", textAlign: "center" }}>
                  Test card: <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 3 }}>4242 4242 4242 4242</code> · any future date · any CVV
                </div>
                <button
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--charcoal-4)", borderRadius: 6, background: "none", cursor: "pointer", fontSize: "0.88rem" }}
                  onClick={closeModal}
                >
                  Done
                </button>
              </div>
            ) : (
              <form className={aStyles.form} onSubmit={handleCreate}>
                {error && <div className={aStyles.error}>{error}</div>}
                <div className={aStyles.field}>
                  <label className={aStyles.label}>Amount (USD)</label>
                  <input className={aStyles.input} type="number" min="0.50" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" required />
                </div>
                <div className={aStyles.field}>
                  <label className={aStyles.label}>Description</label>
                  <input className={aStyles.input} type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="CRM Payment" />
                </div>
                <button className={aStyles.btn} disabled={saving}>{saving ? "Creating…" : "Create Stripe Checkout"}</button>
              </form>
            )}
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
                  <th>Session ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Intent ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className={tStyles.empty}>No payment requests yet</td></tr>
                ) : payments.map(p => {
                  const url = sessionUrls[p.payment_link_id] ?? null;
                  return (
                    <tr key={p.payment_link_id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.78rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.stripe_session_id}
                      </td>
                      <td>${p.amount.toLocaleString()} {p.currency}</td>
                      <td>
                        <span className={`${tStyles.badge} ${tStyles[STATUS_CLASS[p.status] as keyof typeof tStyles] ?? tStyles.badgeGray}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{p.stripe_payment_intent_id ?? "—"}</td>
                      <td>
                        {p.status === "pending" && url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={tStyles.linkBtn}
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", textDecoration: "none" }}
                          >
                            <ExternalLink size={12} /> Pay Now
                          </a>
                        )}
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
