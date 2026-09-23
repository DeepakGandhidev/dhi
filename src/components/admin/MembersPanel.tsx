"use client";

import { useState } from "react";
import { formatDate, formatFcfa } from "@/lib/format";
import { EmptyState, Notice, PackageBadge, StatusPill, ui } from "@/components/portal/ui";
import { adminFetch, useAdminData } from "./useAdmin";

type Row = {
  memberCode: string;
  fullName: string;
  phone: string;
  city?: string;
  packageId: string;
  sponsorCode: string | null;
  placementParent: string | null;
  position: string | null;
  status: string;
  createdAt: string;
  packageOrder: { number: string; total: number; paymentStatus: string } | null;
};

export function MembersPanel({ onInspect }: { onInspect: (code: string) => void }) {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const url = `/api/admin/members?status=${status}&page=${page}${applied ? `&q=${encodeURIComponent(applied)}` : ""}`;
  const { data, error, loading, reload } = useAdminData<{ items: Row[]; total: number; perPage: number }>(url);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  async function act(code: string, action: string) {
    let paymentRef: string | null = null;
    if (action === "activate") {
      paymentRef = window.prompt(`Référence du paiement reçu pour ${code} (ex. transaction Mobile Money) :`);
      if (!paymentRef) return;
    } else if (!window.confirm(`${action === "suspend" ? "Suspendre" : "Réactiver"} ${code} ?`)) return;
    try {
      await adminFetch("/api/admin/members", { method: "POST", body: { memberCode: code, action, paymentRef } });
      setMsg({ tone: "green", text: action === "activate" ? `${code} activé : PV crédités et bonus calculés.` : "Statut mis à jour." });
      reload();
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    }
  }

  return (
    <section className={ui.card}>
      <form
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setApplied(q.trim());
        }}
      >
        <input className={ui.input} style={{ flex: "1 1 220px" }} placeholder="Nom, code, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={ui.input} style={{ width: "auto" }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="pending">En attente de paiement</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
          <option value="">Tous</option>
        </select>
      </form>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {error ? <Notice tone="red">{error}</Notice> : null}
      {!data || loading ? (
        <div className={ui.skeleton} style={{ height: 200 }} />
      ) : data.items.length === 0 ? (
        <EmptyState icon="users">Aucun membre dans cette liste.</EmptyState>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Membre</th>
                <th>Pack</th>
                <th>Parrain / placement</th>
                <th>Paiement du pack</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m.memberCode}>
                  <td>
                    <strong>{m.fullName}</strong>
                    <div className={ui.rowMeta}>
                      <span className="num">{m.memberCode}</span>
                      <span>{m.phone}</span>
                      <span>{formatDate(m.createdAt)}</span>
                    </div>
                  </td>
                  <td><PackageBadge id={m.packageId} /></td>
                  <td className={ui.rowMeta}>
                    {m.sponsorCode ?? "—"}
                    <br />
                    {m.placementParent ? `${m.position === "left" ? "G" : "D"} de ${m.placementParent}` : "Racine"}
                  </td>
                  <td>
                    {m.packageOrder ? (
                      <>
                        {formatFcfa(m.packageOrder.total)}
                        <div className={ui.rowMeta}>{m.packageOrder.number} · <StatusPill status={m.packageOrder.paymentStatus} /></div>
                      </>
                    ) : "—"}
                  </td>
                  <td><StatusPill status={m.status} /></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {m.status === "pending" ? (
                      <button className={`${ui.btn} ${ui.btnSmall}`} onClick={() => act(m.memberCode, "activate")}>Confirmer le paiement</button>
                    ) : null}
                    {m.status === "active" ? (
                      <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => act(m.memberCode, "suspend")}>Suspendre</button>
                    ) : null}
                    {m.status === "suspended" ? (
                      <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => act(m.memberCode, "unsuspend")}>Réactiver</button>
                    ) : null}{" "}
                    <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => onInspect(m.memberCode)}>Registre</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.perPage ? (
        <div className={ui.pager}>
          <button className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`} disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
          <span>Page {page} · {data.total} membres</span>
          <button className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`} disabled={page * data.perPage >= data.total} onClick={() => setPage(page + 1)}>Suivant</button>
        </div>
      ) : null}
    </section>
  );
}
