"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Building2, Globe, Phone, Mail } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";
import aStyles from "@/components/ui/AuthCard.module.css";

interface Company {
  company_id: number;
  company_name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ company_name: "", industry: "", website: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    api.get<Company[]>("/companies").then(setCompanies).finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const body: Record<string, string | undefined> = { company_name: form.company_name };
      if (form.industry) body.industry = form.industry;
      if (form.website) body.website = form.website;
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      const c = await api.post<Company>("/companies", body);
      setCompanies(cs => [c, ...cs]);
      setModal(false);
      setForm({ company_name: "", industry: "", website: "", phone: "", email: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <PageShell
      title="Companies"
      action={
        <button className={tStyles.actionBtn} onClick={() => setModal(true)}>
          <Plus size={14} /> Add Company
        </button>
      }
    >
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className={aStyles.card} style={{ maxWidth: 440, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span className={aStyles.brand} style={{ fontSize: "1rem" }}>New Company</span>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form className={aStyles.form} onSubmit={handleCreate}>
              {error && <div className={aStyles.error}>{error}</div>}
              <div className={aStyles.field}>
                <label className={aStyles.label}>Company Name *</label>
                <input className={aStyles.input} placeholder="Acme Corp" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} required />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Industry</label>
                <input className={aStyles.input} placeholder="Software, Finance, Retail…" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Website</label>
                <input className={aStyles.input} placeholder="https://example.com" type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Phone</label>
                <input className={aStyles.input} placeholder="+92 300 0000000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className={aStyles.field}>
                <label className={aStyles.label}>Email</label>
                <input className={aStyles.input} type="email" placeholder="contact@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <button className={aStyles.btn} disabled={saving}>{saving ? "Saving…" : "Create Company"}</button>
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
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Website</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr><td colSpan={7} className={tStyles.empty}>No companies yet — add one above</td></tr>
                ) : companies.map(c => (
                  <tr key={c.company_id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Building2 size={14} style={{ opacity: 0.4 }} />
                        <strong>{c.company_name}</strong>
                      </div>
                    </td>
                    <td>{c.industry ?? "—"}</td>
                    <td>
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--foreground)" }}>
                          <Globe size={12} />{c.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : "—"}
                    </td>
                    <td>
                      {c.phone ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Phone size={12} />{c.phone}</span>
                      ) : "—"}
                    </td>
                    <td>
                      {c.email ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Mail size={12} />{c.email}</span>
                      ) : "—"}
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className={tStyles.linkBtn} onClick={() => router.push(`/companies/${c.company_id}`)}>View</button>
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
