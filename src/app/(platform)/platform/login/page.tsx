"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import styles from "@/components/ui/AuthCard.module.css";
import pStyles from "./platform-login.module.css";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string }>("/platform/auth/login", form);
      setToken(res.access_token, "platform");
      router.push("/platform/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={pStyles.shell}>
      <div className={styles.card}>
        <div className={styles.brand}>Financify</div>
        <p className={styles.subtitle}>Platform Admin — internal access only</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label className={styles.label}>Admin Email</label>
            <input
              className={styles.input}
              type="email"
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
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Admin Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
