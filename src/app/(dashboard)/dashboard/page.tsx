"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isLoggedIn } from "@/lib/api";
import PageShell from "@/components/dashboard/PageShell";
import tStyles from "@/components/ui/DataTable.module.css";

interface Stats {
  leads?: number;
  contacts?: number;
  opportunities?: number;
  payments?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({});
  const [recentLeads, setRecentLeads] = useState<{ lead_id: number; status: number; assigned_to: number | null; created_at: string }[]>([]);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    async function load() {
      try {
        const [leads, contacts, opps, payments] = await Promise.allSettled([
          api.get<{ lead_id: number; status: number; assigned_to: number | null; created_at: string }[]>("/leads?limit=5"),
          api.get<unknown[]>("/contacts?limit=1"),
          api.get<unknown[]>("/opportunities?limit=1"),
          api.get<unknown[]>("/payments?limit=1"),
        ]);
        if (leads.status === "fulfilled") {
          setRecentLeads(leads.value);
          setStats(s => ({ ...s, leads: leads.value.length }));
        }
        if (contacts.status === "fulfilled") setStats(s => ({ ...s, contacts: contacts.value.length }));
        if (opps.status === "fulfilled") setStats(s => ({ ...s, opportunities: opps.value.length }));
        if (payments.status === "fulfilled") setStats(s => ({ ...s, payments: payments.value.length }));
      } catch (_) { /* ignore */ }
    }
    load();
  }, [router]);

  const STATUS_LABEL: Record<number, string> = {
    1: "New", 2: "Assigned", 3: "Acknowledged", 4: "Escalated", 5: "Recovery", 6: "Converted", 7: "Closed",
  };
  const STATUS_CLASS: Record<number, string> = {
    1: tStyles.badgeGray, 2: tStyles.badgeBlue, 3: tStyles.badgeGreen,
    4: tStyles.badgeRed, 5: tStyles.badgeYellow, 6: tStyles.badgeGreen, 7: tStyles.badgeGray,
  };

  return (
    <PageShell title="Dashboard">
      <div className={tStyles.statsGrid}>
        {[
          { label: "Recent Leads", value: recentLeads.length },
          { label: "Contacts", value: stats.contacts ?? "—" },
          { label: "Opportunities", value: stats.opportunities ?? "—" },
          { label: "Payments", value: stats.payments ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className={tStyles.statCard}>
            <div className={tStyles.statLabel}>{label}</div>
            <div className={tStyles.statValue}>{value}</div>
          </div>
        ))}
      </div>

      <div className={tStyles.card}>
        <div className={tStyles.tableWrap}>
          <table className={tStyles.table}>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr><td colSpan={4} className={tStyles.empty}>No leads yet</td></tr>
              ) : recentLeads.map(l => (
                <tr key={l.lead_id} style={{ cursor: "pointer" }} onClick={() => router.push(`/leads/${l.lead_id}`)}>
                  <td>#{l.lead_id}</td>
                  <td><span className={`${tStyles.badge} ${STATUS_CLASS[l.status] ?? tStyles.badgeGray}`}>{STATUS_LABEL[l.status] ?? l.status}</span></td>
                  <td>{l.assigned_to ?? "Unassigned"}</td>
                  <td>{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
