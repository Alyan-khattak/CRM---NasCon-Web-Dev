"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "@/components/ui/AuthCard.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    workspace_name: "",
    workspace_slug: "",
    owner_full_name: "",
    email: "",
    owner_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/signup", form);
      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function slugify(val: string) {
    return val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  return (
    <div className={styles.card}>
      <div className={styles.brand}>Financify</div>
      <p className={styles.subtitle}>Create your business workspace</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.field}>
          <label className={styles.label}>Business Name</label>
          <input
            className={styles.input}
            placeholder="Acme Solar"
            value={form.workspace_name}
            onChange={e => {
              const name = e.target.value;
              setForm(f => ({ ...f, workspace_name: name, workspace_slug: slugify(name) }));
            }}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Workspace Slug</label>
          <input
            className={styles.input}
            placeholder="acme-solar"
            value={form.workspace_slug}
            onChange={e => setForm(f => ({ ...f, workspace_slug: slugify(e.target.value) }))}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Your Full Name</label>
          <input
            className={styles.input}
            placeholder="Ali Khan"
            value={form.owner_full_name}
            onChange={e => setForm(f => ({ ...f, owner_full_name: e.target.value }))}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            placeholder="ali@acme.com"
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
            placeholder="min 8 characters"
            value={form.owner_password}
            onChange={e => setForm(f => ({ ...f, owner_password: e.target.value }))}
            required
            minLength={8}
          />
        </div>
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Workspace"}
        </button>
      </form>

      <p className={styles.footer}>
        Already have a workspace? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
