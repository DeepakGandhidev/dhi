"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatFcfa } from "@/lib/format";
import { Notice, ui } from "./ui";

/** Requests a withdrawal. The server checks and holds the balance. */
export function WithdrawForm({ available, minPayout, disabledReason }: { available: number; minPayout: number; disabledReason?: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [destination, setDestination] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (disabledReason) return <Notice tone="gold">{disabledReason}</Notice>;
  if (available < minPayout) {
    return (
      <Notice>
        Le retrait minimum est de {formatFcfa(minPayout)}. Solde disponible : {formatFcfa(Math.max(0, available))}.
      </Notice>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await fetch("/api/member/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount.replace(/\s/g, "")), method, destination }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? {});
        setMessage({ tone: "red", text: data.error ?? "Demande refusée." });
      } else {
        setMessage({ tone: "green", text: `Demande ${data.payout.reference} enregistrée. Le montant est réservé jusqu'au versement.` });
        setAmount("");
        router.refresh();
      }
    } catch {
      setMessage({ tone: "red", text: "Connexion impossible. Réessayez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={ui.formGrid} onSubmit={submit} noValidate>
      <label className={ui.field}>
        <span>Montant (FCFA)</span>
        <input
          className={ui.input}
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ""))}
          placeholder={`Entre ${formatFcfa(minPayout)} et ${formatFcfa(available)}`}
          aria-invalid={Boolean(errors.amount)}
          required
        />
        {errors.amount ? <p className={ui.fieldError}>{errors.amount}</p> : null}
      </label>
      <label className={ui.field}>
        <span>Mode de versement</span>
        <select className={ui.input} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="mobile_money">Mobile Money</option>
          <option value="bank">Virement bancaire</option>
          <option value="cash">Retrait au bureau DHI</option>
        </select>
      </label>
      <label className={ui.field}>
        <span>{method === "bank" ? "IBAN / numéro de compte" : method === "cash" ? "Bureau ou téléphone de contact" : "Numéro Mobile Money"}</span>
        <input
          className={ui.input}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={method === "mobile_money" ? "+228 90 00 00 00" : ""}
          aria-invalid={Boolean(errors.destination)}
          required
        />
        {errors.destination ? <p className={ui.fieldError}>{errors.destination}</p> : null}
      </label>
      {message ? <Notice tone={message.tone} icon={message.tone === "green" ? "check" : "info"}>{message.text}</Notice> : null}
      <button type="submit" className={`${ui.btn} ${ui.btnGold}`} disabled={busy}>
        {busy ? "Envoi…" : "Demander le retrait"}
      </button>
    </form>
  );
}
