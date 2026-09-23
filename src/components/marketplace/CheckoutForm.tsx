"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice, ui } from "@/components/portal/ui";
import s from "./marketplace.module.css";

const METHODS = [
  { id: "mobile_money", label: "Mobile Money", hint: "Vous recevez les instructions de paiement par SMS ; la commande est confirmée à réception." },
  { id: "cash_on_delivery", label: "Paiement à la livraison", hint: "Réglez en espèces ou Mobile Money au livreur." },
  { id: "bank_transfer", label: "Virement bancaire", hint: "Coordonnées bancaires envoyées avec la confirmation." },
];

/** Contact, delivery and payment method. Prices and totals come from the server. */
export function CheckoutForm({ guest }: { guest: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/marketplace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? {});
        setError(data.error ?? "La commande n'a pas pu être créée.");
        return;
      }
      router.push(`/marketplace/commande/merci?n=${encodeURIComponent(data.number)}`);
      router.refresh();
    } catch {
      setError("Connexion impossible. Votre commande n'a pas été créée.");
    } finally {
      setBusy(false);
    }
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={ui.field}>
      <span>{label}</span>
      <input className={ui.input} name={name} aria-invalid={Boolean(errors[name])} {...props} />
      {errors[name] ? <p className={ui.fieldError}>{errors[name]}</p> : null}
    </label>
  );

  return (
    <form className={`${ui.card} ${ui.formGrid}`} onSubmit={submit} noValidate>
      {guest ? (
        <>
          <h2 className={ui.sectionTitle} style={{ margin: 0 }}>Vos coordonnées</h2>
          {field("name", "Nom complet", { required: true, autoComplete: "name" })}
          {field("phone", "Téléphone", { required: true, inputMode: "tel", autoComplete: "tel" })}
          {field("email", "E-mail (facultatif)", { inputMode: "email", autoComplete: "email" })}
        </>
      ) : null}
      <h2 className={ui.sectionTitle} style={{ margin: 0 }}>Livraison</h2>
      {field("address", "Adresse", { required: true, autoComplete: "street-address" })}
      {field("city", "Ville", { required: true, autoComplete: "address-level2" })}
      {field("notes", "Instructions (facultatif)")}
      <h2 className={ui.sectionTitle} style={{ margin: 0 }}>Paiement</h2>
      <div className={s.methods} role="radiogroup">
        {METHODS.map((m, i) => (
          <label key={m.id} className={s.method}>
            <input type="radio" name="paymentMethod" value={m.id} defaultChecked={i === 0} />
            <span>
              <strong>{m.label}</strong>
              <small>{m.hint}</small>
            </span>
          </label>
        ))}
      </div>
      {errors.paymentMethod ? <p className={ui.fieldError}>{errors.paymentMethod}</p> : null}
      {error ? <Notice tone="red">{error}</Notice> : null}
      <button className={`${ui.btn} ${ui.btnGold}`} disabled={busy}>
        {busy ? "Création de la commande…" : "Confirmer la commande"}
      </button>
    </form>
  );
}
