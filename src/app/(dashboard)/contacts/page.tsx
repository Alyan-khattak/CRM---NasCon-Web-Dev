"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Contact { contact_id: number; first_name: string; last_name: string | null; email: string | null; phone: string | null; created_at: string; }

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    api.get<Contact[]>("/contacts").then(setContacts).finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const c = await api.post<Contact>("/contacts", form);
      setContacts(cs => [c, ...cs]); setModal(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <PageShell title="Contacts" action={<button className={tStyles.actionBtn} onClick={() => setModal(true)}><Plus size={14} /> Add Contact</button>}>
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className={aStyles.card} style={{ maxWidth: 400, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>New Contact</span>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleCreate}>
              {error && <div className={aStyles.error}>{error}</div>}
              {(["first_name", "last_name", "email", "phone"] as const).map(k => (
                <div key={k} className={aStyles.field}>
                  <label className={aStyles.label}>{k.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</label>
                  <input className={aStyles.input} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={k === "first_name"} />
                </div>
              ))}
              <button className={aStyles.btn} disabled={saving}>{saving ? "Saving…" : "Create Contact"}</button>
            </form>
          </div>
        </div>
      )}
      {loading ? <div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div> : (
        <div className={tStyles.card}>
          <div className={tStyles.tableWrap}>
            <table className={tStyles.table}>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Added</th><th></th></tr></thead>
              <tbody>
                {contacts.length === 0
                  ? <tr><td colSpan={5} className={tStyles.empty}>No contacts yet</td></tr>
                  : contacts.map(c => (
                    <tr key={c.contact_id}>
                      <td>{c.first_name} {c.last_name}</td>
                      <td>{c.email ?? "—"}</td>
                      <td>{c.phone ?? "—"}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td><button className={tStyles.linkBtn} onClick={() => router.push(`/contacts/${c.contact_id}`)}>View</button></td>
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
