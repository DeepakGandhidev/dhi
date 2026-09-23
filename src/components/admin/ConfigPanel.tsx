"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { Notice, ui } from "@/components/portal/ui";
import type { Rules } from "@/lib/services/rules";
import { adminFetch, useAdminData } from "./useAdmin";

type ConfigData = { rules: Rules; defaults: Rules; overrides: Record<string, unknown>; history: { version: number; by: string; createdAt: string }[] };

const PKGS = ["little", "index", "ring", "middle", "thumb"] as const;
const PKG_FIELDS = [
  ["pv", "PV"],
  ["amount", "Prix FCFA"],
  ["directBps", "Direct (pb)"],
  ["binaryBps", "Binaire (pb)"],
  ["discountBps", "Remise (pb)"],
] as const;

/**
 * Business rules, editable. Only values that differ from the plan defaults
 * are stored as overrides; each save is a new numbered version, and every
 * ledger entry records the version it was calculated under.
 */
export function ConfigPanel() {
  const { data, error, reload } = useAdminData<ConfigData>("/api/admin/config");
  const [r, setR] = useState<Rules | null>(null);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  useEffect(() => {
    if (data) setR(structuredClone(data.rules));
  }, [data]);

  if (error) return <Notice tone="red">{error}</Notice>;
  if (!data || !r) return <div className={ui.skeleton} style={{ height: 300 }} />;
  const d = data.defaults;

  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const input = (value: number, onChange: (n: number) => void, changed: boolean) => (
    <input
      className={ui.input}
      style={{ minWidth: 80, background: changed ? "var(--gold-soft)" : undefined }}
      inputMode="numeric"
      value={Number.isNaN(value) ? "" : String(value)}
      onChange={(e) => onChange(num(e.target.value))}
    />
  );

  function overrides(): Record<string, unknown> {
    const o: Record<string, unknown> = {};
    for (const k of ["pvValue", "pairPv", "generationLimit", "affiliateBps", "affiliateWindowDays", "clickDedupeHours", "minPayout"] as const) {
      if (r![k] !== d[k]) o[k] = r![k];
    }
    if (r!.fastCumulation.people !== d.fastCumulation.people || r!.fastCumulation.amount !== d.fastCumulation.amount) {
      o.fastCumulation = { people: r!.fastCumulation.people, amount: r!.fastCumulation.amount };
    }
    const pk: Record<string, Record<string, number>> = {};
    for (const id of PKGS) {
      for (const [f] of PKG_FIELDS) {
        if (r!.packages[id][f] !== d.packages[id][f]) (pk[id] ??= {})[f] = r!.packages[id][f];
      }
    }
    if (Object.keys(pk).length) o.packages = pk;
    const aw = r!.awards
      .map((a) => {
        const def = d.awards.find((x) => x.id === a.id)!;
        const x: Record<string, unknown> = { id: a.id };
        if (a.networkPeople !== def.networkPeople) x.networkPeople = a.networkPeople;
        if (a.groupPv !== def.groupPv) x.groupPv = a.groupPv;
        if (a.sponsoredWith && def.sponsoredWith && a.sponsoredWith.count !== def.sponsoredWith.count) x.sponsoredWith = { count: a.sponsoredWith.count };
        return Object.keys(x).length > 1 ? x : null;
      })
      .filter(Boolean);
    if (aw.length) o.awards = aw;
    return o;
  }

  async function save() {
    if (!window.confirm("Enregistrer ces règles ? Elles s'appliquent à tous les calculs à partir de maintenant ; les écritures passées ne changent pas.")) return;
    try {
      await adminFetch("/api/admin/config", { method: "PUT", body: { overrides: overrides() } });
      setMsg({ tone: "green", text: "Règles enregistrées." });
      reload();
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    }
  }

  const set = (patch: Partial<Rules>) => setR({ ...r, ...patch });
  const general: [keyof Rules, string][] = [
    ["pvValue", "Valeur d'1 PV (FCFA)"],
    ["pairPv", "PV par côté pour 1 paire"],
    ["generationLimit", "Générations payées (vous compris)"],
    ["affiliateBps", "Commission affilié par défaut (pb)"],
    ["affiliateWindowDays", "Durée d'attribution affilié (jours)"],
    ["clickDedupeHours", "Fenêtre de dédoublonnage des clics (h)"],
    ["minPayout", "Retrait minimum (FCFA)"],
  ];

  return (
    <div className={ui.page}>
      <Notice>
        Version en vigueur : <strong>{data.rules.version}</strong>. Les champs surlignés diffèrent du plan par défaut. pb =
        points de base (100 pb = 1 %).
      </Notice>
      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Général</h2>
        <div className={ui.grid3}>
          {general.map(([k, label]) => (
            <label key={k} className={ui.field}>
              <span>{label}</span>
              {input(r[k] as number, (n) => set({ [k]: n } as Partial<Rules>), r[k] !== d[k])}
            </label>
          ))}
          <label className={ui.field}>
            <span>Fast Cumulation : personnes actives</span>
            {input(r.fastCumulation.people, (n) => set({ fastCumulation: { ...r.fastCumulation, people: n } }), r.fastCumulation.people !== d.fastCumulation.people)}
          </label>
          <label className={ui.field}>
            <span>Fast Cumulation : montant (FCFA, 0 = à confirmer)</span>
            {input(r.fastCumulation.amount, (n) => set({ fastCumulation: { ...r.fastCumulation, amount: n } }), r.fastCumulation.amount !== d.fastCumulation.amount)}
          </label>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Packs</h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Pack</th>
                {PKG_FIELDS.map(([, l]) => <th key={l}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {PKGS.map((id) => (
                <tr key={id}>
                  <td><strong>{r.packages[id].name}</strong></td>
                  {PKG_FIELDS.map(([f]) => (
                    <td key={f}>
                      {input(r.packages[id][f], (n) => setR({ ...r, packages: { ...r.packages, [id]: { ...r.packages[id], [f]: n } } }), r.packages[id][f] !== d.packages[id][f])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Awards</h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr><th>Award</th><th>Réseau actif</th><th>PV cumulés</th><th>Parrainés qualifiés</th></tr>
            </thead>
            <tbody>
              {r.awards.map((a, i) => {
                const def = d.awards[i];
                const upd = (patch: Partial<typeof a>) => setR({ ...r, awards: r.awards.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <tr key={a.id}>
                    <td><strong>{a.id}</strong></td>
                    <td>{input(a.networkPeople, (n) => upd({ networkPeople: n }), a.networkPeople !== def.networkPeople)}</td>
                    <td>{input(a.groupPv, (n) => upd({ groupPv: n }), a.groupPv !== def.groupPv)}</td>
                    <td>
                      {a.sponsoredWith
                        ? input(a.sponsoredWith.count, (n) => upd({ sponsoredWith: { ...a.sponsoredWith!, count: n } }), a.sponsoredWith.count !== def.sponsoredWith?.count)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`${ui.btn} ${ui.btnNavy}`} onClick={save}>Enregistrer une nouvelle version</button>
        <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setR(structuredClone(data.rules))}>Annuler les modifications</button>
      </div>

      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Historique des versions</h2>
        {data.history.length === 0 ? (
          <p className={ui.pageSub}>Aucune modification : le plan par défaut s&apos;applique.</p>
        ) : (
          <div className={ui.list}>
            {data.history.map((h) => (
              <div key={h.version} className={ui.row}>
                <div className={ui.rowTitle}>Version {h.version}</div>
                <div className={ui.rowMeta}>{formatDateTime(h.createdAt)} · {h.by}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
