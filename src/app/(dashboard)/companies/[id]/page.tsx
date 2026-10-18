"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Building2, Globe, Phone, Mail, Users } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";

interface Company {
  company_id: number;
  company_name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

interface Contact {
  contact_id: number;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    loadAll();
  }, [router, companyId]);

  async function loadAll() {
    try {
      const c = await api.get<Company>(`/companies/${companyId}`);
      setCompany(c);
      const allContacts = await api.get<Contact[]>("/contacts?limit=200").catch(() => [] as Contact[]);
      setContacts((allContacts as Array<Contact & { company_id: number | null }>).filter(ct => ct.company_id === parseInt(companyId)));
    } catch { router.replace("/companies"); }
    finally { setLoading(false); }
  }

  if (loading) return <PageShell title="Company"><div style={{ padding: "2rem", color: "var(--charcoal-2)" }}>Loading…</div></PageShell>;
  if (!company) return null;

  return (
    <PageShell
      title={company.company_name}
      action={
        <button className={tStyles.linkBtn} onClick={() => router.push("/companies")} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <ArrowLeft size={14} /> Back to Companies
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        <div className={tStyles.card} style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--accent-sky)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={22} style={{ opacity: 0.5 }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: "1.2rem" }}>{company.company_name}</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--charcoal-2)" }}>Company #{company.company_id}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              { label: "Industry", icon: <Building2 size={14} />, value: company.industry ?? "—" },
              { label: "Website", icon: <Globe size={14} />, value: company.website ? <a href={company.website} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{company.website}</a> : "—" },
              { label: "Phone", icon: <Phone size={14} />, value: company.phone ?? "—" },
              { label: "Email", icon: <Mail size={14} />, value: company.email ?? "—" },
              { label: "Added", icon: null, value: new Date(company.created_at).toLocaleDateString() },
            ].map(({ label, icon, value }) => (
              <div key={label}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--charcoal-2)", marginBottom: "0.3rem" }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", opacity: icon ? 1 : 0.85 }}>
                  {icon && <span style={{ opacity: 0.45 }}>{icon}</span>}{value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={tStyles.card} style={{ padding: "1.25rem", height: "fit-content" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Users size={16} style={{ opacity: 0.55 }} />
            <strong>Related Contacts</strong>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--charcoal-2)", marginBottom: "0.75rem" }}>
            Contacts linked to this company
          </p>
          {contacts.length === 0 ? (
            <div style={{ fontSize: "0.875rem", color: "var(--charcoal-2)" }}>No contacts yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {contacts.slice(0, 10).map(c => (
                <button
                  key={c.contact_id}
                  className={tStyles.linkBtn}
                  onClick={() => router.push(`/contacts/${c.contact_id}`)}
                  style={{ width: "100%", textAlign: "left", justifyContent: "flex-start" }}
                >
                  {c.first_name} {c.last_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
