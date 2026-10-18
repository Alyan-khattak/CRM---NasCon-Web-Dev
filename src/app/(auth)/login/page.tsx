"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import styles from "@/components/ui/AuthCard.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ workspace_slug: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string; workspace_name?: string }>(
        "/auth/login",
        form
      );
      setToken(res.access_token, "workspace");
      if (res.workspace_name) localStorage.setItem("crm_workspace_name", res.workspace_name);
      localStorage.setItem("crm_workspace_slug", form.workspace_slug);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.brand}>Financify</div>
      <p className={styles.subtitle}>Sign in to your workspace</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.field}>
          <label className={styles.label}>Workspace</label>
          <input
            className={styles.input}
            placeholder="your-workspace"
            value={form.workspace_slug}
            onChange={e => setForm(f => ({ ...f, workspace_slug: e.target.value }))}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
          />
        </div>
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className={styles.footer}>
        No account? <Link href="/signup">Create workspace</Link>
      </p>
    </div>
  );
}
