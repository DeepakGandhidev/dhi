"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode: String(data.get("memberCode") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(json.error ?? "Could not sign you in.");
      }
    } catch {
      setError("We could not reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Sign in</h1>
      <p className="lede">
        Use the member code you were given when you registered. It looks like DHI-K4M2PQ.
      </p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <label className="field">
          <span>Member code</span>
          <input
            name="memberCode"
            autoComplete="username"
            placeholder="DHI-K4M2PQ"
            style={{ textTransform: "uppercase" }}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className={styles.alt}>
        Not registered yet? <Link href="/join">Join DHI</Link>. Lost your code? Ask the member
        who sponsored you, or contact the DHI office.
      </p>
    </div>
  );
}
