"use client";

import { useState } from "react";
import { Notice, ui } from "@/components/portal/ui";

export function ReviewForm({ slug }: { slug: string }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [state, setState] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (state?.tone === "green") return <Notice tone="green" icon="check">{state.text}</Notice>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setState({ tone: "red", text: "Choisissez une note." });
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: slug, rating, body }),
      });
      const data = await res.json();
      setState(res.ok ? { tone: "green", text: "Merci ! Votre avis sera publié après validation." } : { tone: "red", text: data.error ?? "Échec." });
    } catch {
      setState({ tone: "red", text: "Connexion impossible." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={ui.formGrid} onSubmit={submit}>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 4 }}>
        <legend className={ui.statLabel} style={{ marginBottom: 6 }}>Votre note</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-pressed={rating === n}
            aria-label={`${n} sur 5`}
            style={{ border: 0, background: "none", fontSize: 26, cursor: "pointer", color: n <= rating ? "var(--gold)" : "#d6d9e5", padding: 2 }}
          >
            ★
          </button>
        ))}
      </fieldset>
      <textarea className={ui.input} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Votre avis sur ce produit (facultatif)" />
      {state ? <Notice tone={state.tone}>{state.text}</Notice> : null}
      <button className={ui.btn} disabled={busy}>{busy ? "Envoi…" : "Publier mon avis"}</button>
    </form>
  );
}
