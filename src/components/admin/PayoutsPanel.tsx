"use client";

import { useState } from "react";
import { t } from "@/i18n/fr";
import { formatDate, formatFcfa } from "@/lib/format";
import { EmptyState, Notice, StatusPill, ui } from "@/components/portal/ui";
import { adminFetch, useAdminData } from "./useAdmin";

type Payout = {
  _id: string;
  reference: string;
  member: string;
  amount: number;
  method: string;
  destination: string;
  status: string;
  providerRef?: string;
  failureReason?: string;
  createdAt: string;
};

const METHOD: Record<string, string> = { mobile_money: "Mobile Money", bank: "Virement", cash: "Bureau" };

export function PayoutsPanel({ onInspect }: { onInspect: (code: string) => void }) {
  const [status, setStatus] = useState("pending");
  const { data, error, loading, reload } = useAdminData<{ items: Payout[] }>(`/api/admin/payouts${status ? `?status=${status}` : ""}`);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  async function move(p: Payout, to: string) {
    const body: Record<string, string> = { id: p._id, status: to };
    if (to === "paid") {
      const ref = window.prompt(`Référence de la transaction pour ${p.reference} (${formatFcfa(p.amount)} vers ${p.destination}) :`);
      if (!ref) return;
      body.providerRef = ref;
    }
    if (to === "failed" || to === "cancelled") {
      const reason = window.prompt("Motif :");
      if (!reason) return;
      body.reason = reason;
    }
    try {
      await adminFetch("/api/admin/payouts", { method: "POST", body });
      setMsg({ tone: "green", text: `${p.reference} : ${t.status[to]}.` });
      reload();
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    }
  }

  return (
    <section className={ui.card}>
      <nav className={ui.tabs} style={{ marginBottom: 12 }}>
        {["pending", "processing", "paid", "failed", "cancelled", ""].map((s) => (
          <button key={s || "all"} type="button" className={ui.tab} data-active={status === s} onClick={() => setStatus(s)}>
            {s ? t.status[s] : "Tous"}
          </button>
        ))}
      </nav>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {error ? <Notice tone="red">{error}</Notice> : null}
      {!data || loading ? (
        <div className={ui.skeleton} style={{ height: 160 }} />
      ) : data.items.length === 0 ? (
        <EmptyState icon="wallet">Aucune demande de retrait.</EmptyState>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Membre</th>
                <th>Versement</th>
                <th className={ui.num}>Montant</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id}>
                  <td>
                    <strong className="num">{p.reference}</strong>
                    <div className={ui.rowMeta}>{formatDate(p.createdAt)}</div>
                  </td>
                  <td>
                    <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => onInspect(p.member)}>{p.member}</button>
                  </td>
                  <td>
                    {METHOD[p.method]}
                    <div className={ui.rowMeta}>{p.destination}</div>
                  </td>
                  <td className={ui.num}>{formatFcfa(p.amount)}</td>
                  <td>
                    <StatusPill status={p.status} />
                    {p.providerRef ? <div className={ui.rowMeta}>{p.providerRef}</div> : null}
                    {p.failureReason ? <div className={ui.rowMeta}>{p.failureReason}</div> : null}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {p.status === "pending" ? (
                      <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => move(p, "processing")}>En cours</button>
                    ) : null}{" "}
                    {p.status === "pending" || p.status === "processing" ? (
                      <>
                        <button className={`${ui.btn} ${ui.btnSmall}`} onClick={() => move(p, "paid")}>Payé</button>{" "}
                        <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => move(p, "failed")}>Échec</button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
