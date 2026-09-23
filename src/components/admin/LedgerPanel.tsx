"use client";

import { useState } from "react";
import { t } from "@/i18n/fr";
import { formatBps, formatDateTime, formatFcfa, formatPv, formatSignedFcfa } from "@/lib/format";
import { EmptyState, Notice, PackageBadge, StatusPill, ui } from "@/components/portal/ui";
import { adminFetch, useAdminData } from "./useAdmin";

type Ledger = {
  member: { memberCode: string; fullName: string; packageId: string; status: string; sponsorCode: string | null; placementParent: string | null; depth: number };
  pv: { _id: string; pv: number; type: string; note?: string; createdAt: string; sourceId: string }[];
  volume: { _id: string; fromMember: string; leg: string; pv: number; generation: number; unrecovered?: number; createdAt: string }[];
  bonuses: { _id: string; type: string; amount: number; pv: number; rateBps: number; status: string; description: string; details: Record<string, unknown>; history: { status: string; at: string; by?: string; note?: string }[]; createdAt: string }[];
  binary: { carryLeft: number; carryRight: number; totalLeft: number; totalRight: number; matchedPv: number; pairs: number } | null;
  wallet: Record<string, number>;
  ledgerWallet: Record<string, number>;
  walletConsistent: boolean;
  drift: string[];
  payouts: { _id: string; reference: string; amount: number; status: string; createdAt: string }[];
};

/** Everything behind one member's figures, and manual corrections as new entries. */
export function LedgerPanel({ initial }: { initial: string | null }) {
  const [code, setCode] = useState(initial ?? "");
  const [query, setQuery] = useState(initial ?? "");
  const { data, error, loading, reload } = useAdminData<Ledger>(query ? `/api/admin/ledger?member=${encodeURIComponent(query)}` : null);
  const [adj, setAdj] = useState({ kind: "bonus", amount: "", note: "" });
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className={ui.page}>
      <form
        className={ui.card}
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(code.trim().toUpperCase());
        }}
      >
        <input className={ui.input} style={{ flex: "1 1 200px" }} placeholder="Code membre (DHI-XXXXXX)" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className={ui.btn}>Inspecter</button>
      </form>

      {error ? <Notice tone="red">{error}</Notice> : null}
      {!query ? <EmptyState icon="search">Saisissez un code membre pour voir chaque écriture PV, volume, bonus et paiement.</EmptyState> : null}
      {query && (loading || !data) && !error ? <div className={ui.skeleton} style={{ height: 240 }} /> : null}

      {data ? (
        <>
          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>
              {data.member.fullName} · {data.member.memberCode}
              <span style={{ display: "flex", gap: 6 }}>
                <PackageBadge id={data.member.packageId} />
                <StatusPill status={data.member.status} />
              </span>
            </h2>
            <div className={ui.grid3}>
              <dl className={ui.kv}>
                <dt>Parrain</dt><dd>{data.member.sponsorCode ?? "—"}</dd>
                <dt>Placé sous</dt><dd>{data.member.placementParent ?? "Racine"}</dd>
                <dt>Profondeur</dt><dd>{data.member.depth}</dd>
              </dl>
              <dl className={ui.kv}>
                <dt>Report G / D</dt><dd>{data.binary?.carryLeft ?? 0} / {data.binary?.carryRight ?? 0} PV</dd>
                <dt>Cumul G / D</dt><dd>{data.binary?.totalLeft ?? 0} / {data.binary?.totalRight ?? 0} PV</dd>
                <dt>Apparié</dt><dd>{formatPv(data.binary?.matchedPv ?? 0)} ({data.binary?.pairs ?? 0} paires)</dd>
              </dl>
              <dl className={ui.kv}>
                <dt>Disponible</dt><dd>{formatFcfa(data.wallet.available)}</dd>
                <dt>En attente</dt><dd>{formatFcfa(data.wallet.pending)}</dd>
                <dt>Retraits bloqués</dt><dd>{formatFcfa(data.wallet.locked)}</dd>
                <dt>Retiré</dt><dd>{formatFcfa(data.wallet.withdrawn)}</dd>
              </dl>
            </div>
            <div style={{ marginTop: 12 }}>
              {data.walletConsistent ? (
                <Notice tone="green" icon="check">Le solde correspond exactement au registre.</Notice>
              ) : (
                <Notice tone="red" title="Écart entre le solde et le registre">
                  Champs concernés : {data.drift.join(", ")}. Registre : {JSON.stringify(data.ledgerWallet)}
                </Notice>
              )}
            </div>
          </section>

          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>Correction manuelle</h2>
            <form
              className={ui.grid3}
              style={{ alignItems: "end" }}
              onSubmit={async (e) => {
                e.preventDefault();
                if (!window.confirm("Créer une écriture de correction ? Elle sera visible par le membre et ne peut pas être supprimée.")) return;
                try {
                  await adminFetch("/api/admin/adjustments", { method: "POST", body: { member: data.member.memberCode, kind: adj.kind, amount: Number(adj.amount), note: adj.note } });
                  setMsg({ tone: "green", text: "Correction enregistrée." });
                  setAdj({ kind: adj.kind, amount: "", note: "" });
                  reload();
                } catch (err) {
                  setMsg({ tone: "red", text: (err as Error).message });
                }
              }}
            >
              <label className={ui.field}>
                <span>Type</span>
                <select className={ui.input} value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })}>
                  <option value="bonus">Montant (FCFA)</option>
                  <option value="pv">PV</option>
                </select>
              </label>
              <label className={ui.field}>
                <span>Montant (négatif pour retirer)</span>
                <input className={ui.input} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} inputMode="numeric" />
              </label>
              <label className={ui.field}>
                <span>Motif</span>
                <input className={ui.input} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
              </label>
              <button className={`${ui.btn} ${ui.btnNavy}`}>Enregistrer la correction</button>
            </form>
            {msg ? <div style={{ marginTop: 10 }}><Notice tone={msg.tone}>{msg.text}</Notice></div> : null}
          </section>

          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>Bonus ({data.bonuses.length})</h2>
            <div className={ui.list}>
              {data.bonuses.map((b) => (
                <div key={b._id} className={ui.row}>
                  <div>
                    <div className={ui.rowTitle}>{t.bonusTypes[b.type]} — {b.description}</div>
                    <div className={ui.rowMeta}>
                      <span>{formatDateTime(b.createdAt)}</span>
                      <StatusPill status={b.status} />
                      {b.rateBps ? <span>{formatBps(b.rateBps)} sur {b.pv} PV</span> : null}
                      <button type="button" className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => setOpen(open === b._id ? null : b._id)}>
                        {open === b._id ? "Masquer le calcul" : "Calcul"}
                      </button>
                    </div>
                    {open === b._id ? (
                      <pre style={{ fontSize: 11, background: "#f5f6fa", padding: 10, borderRadius: 10, overflowX: "auto", margin: "8px 0 0" }}>
                        {JSON.stringify({ details: b.details, history: b.history }, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                  <div className={`${ui.rowAmount} ${b.status === "reversed" ? ui.neg : ui.pos}`}>{formatSignedFcfa(b.status === "reversed" ? -b.amount : b.amount)}</div>
                </div>
              ))}
            </div>
          </section>

          <div className={ui.grid2}>
            <section className={ui.card}>
              <h2 className={ui.sectionTitle}>PV personnels ({data.pv.length})</h2>
              <div className={ui.list}>
                {data.pv.map((p) => (
                  <div key={p._id} className={ui.row}>
                    <div>
                      <div className={ui.rowTitle}>{t.pvTypes[p.type]}</div>
                      <div className={ui.rowMeta}>{formatDateTime(p.createdAt)} · {p.note ?? p.sourceId}</div>
                    </div>
                    <div className={ui.rowAmount}>{p.pv > 0 ? "+" : ""}{p.pv} PV</div>
                  </div>
                ))}
              </div>
            </section>
            <section className={ui.card}>
              <h2 className={ui.sectionTitle}>Volume reçu sur les branches</h2>
              <div className={ui.list}>
                {data.volume.map((v) => (
                  <div key={v._id} className={ui.row}>
                    <div>
                      <div className={ui.rowTitle}>{v.fromMember} · G{v.generation}</div>
                      <div className={ui.rowMeta}>
                        {t.legs[v.leg]} · {formatDateTime(v.createdAt)}
                        {v.unrecovered ? ` · ${v.unrecovered} PV déjà appariés non repris` : ""}
                      </div>
                    </div>
                    <div className={ui.rowAmount}>{v.pv > 0 ? "+" : ""}{v.pv} PV</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
