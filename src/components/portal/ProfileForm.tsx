"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice, ui } from "./ui";

type Profile = { fullName: string; city: string; avatarUrl: string; phone: string; email: string };

async function save(payload: Record<string, unknown>) {
  const res = await fetch("/api/member/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/** Open fields save directly; phone, email and password ask for the current password. */
export function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [basic, setBasic] = useState({ fullName: initial.fullName, city: initial.city, avatarUrl: initial.avatarUrl });
  const [secure, setSecure] = useState({ phone: initial.phone, email: initial.email, newPassword: "", currentPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ where: "basic" | "secure"; tone: "green" | "red"; text: string } | null>(null);
  const [busy, setBusy] = useState<"basic" | "secure" | null>(null);

  async function submitBasic(e: React.FormEvent) {
    e.preventDefault();
    setBusy("basic");
    setErrors({});
    const { ok, data } = await save(basic).catch(() => ({ ok: false, data: { error: "Connexion impossible." } }));
    setBusy(null);
    setErrors(data.errors ?? {});
    setMsg({ where: "basic", tone: ok ? "green" : "red", text: ok ? "Profil mis à jour." : data.error ?? "Échec." });
    if (ok) router.refresh();
  }

  async function submitSecure(e: React.FormEvent) {
    e.preventDefault();
    setBusy("secure");
    setErrors({});
    const payload: Record<string, unknown> = { currentPassword: secure.currentPassword };
    if (secure.phone !== initial.phone) payload.phone = secure.phone;
    if (secure.email !== initial.email) payload.email = secure.email;
    if (secure.newPassword) payload.newPassword = secure.newPassword;
    if (Object.keys(payload).length === 1) {
      setBusy(null);
      setMsg({ where: "secure", tone: "red", text: "Aucune modification." });
      return;
    }
    const { ok, data } = await save(payload).catch(() => ({ ok: false, data: { error: "Connexion impossible." } }));
    setBusy(null);
    setErrors(data.errors ?? {});
    setMsg({ where: "secure", tone: ok ? "green" : "red", text: ok ? "Informations de connexion mises à jour." : data.error ?? "Échec." });
    if (ok) {
      setSecure((v) => ({ ...v, newPassword: "", currentPassword: "" }));
      router.refresh();
    }
  }

  const field = (name: string, label: string, input: React.ReactNode) => (
    <label className={ui.field}>
      <span>{label}</span>
      {input}
      {errors[name] ? <p className={ui.fieldError}>{errors[name]}</p> : null}
    </label>
  );

  return (
    <div className={ui.grid2}>
      <form className={`${ui.card} ${ui.formGrid}`} onSubmit={submitBasic}>
        <h2 className={ui.sectionTitle} style={{ margin: 0 }}>Informations</h2>
        {field("fullName", "Nom complet", <input className={ui.input} value={basic.fullName} onChange={(e) => setBasic({ ...basic, fullName: e.target.value })} required />)}
        {field("city", "Ville", <input className={ui.input} value={basic.city} onChange={(e) => setBasic({ ...basic, city: e.target.value })} />)}
        {field(
          "avatarUrl",
          "Photo de profil (adresse https://)",
          <input className={ui.input} value={basic.avatarUrl} onChange={(e) => setBasic({ ...basic, avatarUrl: e.target.value })} placeholder="https://…" inputMode="url" />
        )}
        {msg?.where === "basic" ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        <button className={ui.btn} disabled={busy === "basic"}>{busy === "basic" ? "Enregistrement…" : "Enregistrer"}</button>
      </form>

      <form className={`${ui.card} ${ui.formGrid}`} onSubmit={submitSecure}>
        <h2 className={ui.sectionTitle} style={{ margin: 0 }}>Connexion et sécurité</h2>
        {field("phone", "Téléphone", <input className={ui.input} value={secure.phone} onChange={(e) => setSecure({ ...secure, phone: e.target.value })} inputMode="tel" />)}
        {field("email", "E-mail", <input className={ui.input} value={secure.email} onChange={(e) => setSecure({ ...secure, email: e.target.value })} inputMode="email" />)}
        {field(
          "newPassword",
          "Nouveau mot de passe (facultatif)",
          <input className={ui.input} type="password" value={secure.newPassword} onChange={(e) => setSecure({ ...secure, newPassword: e.target.value })} autoComplete="new-password" />
        )}
        {field(
          "currentPassword",
          "Mot de passe actuel (obligatoire pour ces changements)",
          <input className={ui.input} type="password" value={secure.currentPassword} onChange={(e) => setSecure({ ...secure, currentPassword: e.target.value })} autoComplete="current-password" required />
        )}
        {msg?.where === "secure" ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        <button className={`${ui.btn} ${ui.btnNavy}`} disabled={busy === "secure"}>{busy === "secure" ? "Vérification…" : "Mettre à jour"}</button>
      </form>
    </div>
  );
}
