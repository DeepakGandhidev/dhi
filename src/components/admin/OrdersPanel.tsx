"use client";

import { useState } from "react";
import { t } from "@/i18n/fr";
import { formatDate, formatFcfa } from "@/lib/format";
import { EmptyState, Notice, StatusPill, ui } from "@/components/portal/ui";
import { adminFetch, useAdminData } from "./useAdmin";

type Order = {
  _id: string;
  number: string;
  buyer: string | null;
  guest: { name: string; phone: string } | null;
  shipping: { address: string; city: string } | null;
  items: { name: string; qty: number; lineTotal: number }[];
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentRef: string | null;
  affiliate: { member: string } | null;
  createdAt: string;
};

// Mirrors the server's lifecycle; the server enforces it regardless.
const NEXT: Record<string, { to: string; label: string; danger?: boolean }[]> = {
  pending: [
    { to: "confirmed", label: "Paiement reçu" },
    { to: "cancelled", label: "Annuler", danger: true },
  ],
  confirmed: [
    { to: "processing", label: "En préparation" },
    { to: "shipped", label: "Expédiée" },
    { to: "refunded", label: "Rembourser", danger: true },
  ],
  processing: [
    { to: "shipped", label: "Expédiée" },
    { to: "refunded", label: "Rembourser", danger: true },
  ],
  shipped: [
    { to: "delivered", label: "Livrée" },
    { to: "refunded", label: "Rembourser", danger: true },
  ],
  delivered: [{ to: "refunded", label: "Rembourser", danger: true }],
};

export function OrdersPanel() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<{ items: Order[]; total: number; perPage: number }>(
    `/api/admin/orders?page=${page}${status ? `&status=${status}` : ""}`
  );
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  async function move(o: Order, to: string) {
    let paymentRef: string | undefined;
    let note: string | undefined;
    if (to === "confirmed") {
      paymentRef = window.prompt(`Référence du paiement de ${o.number} (${formatFcfa(o.total)}) :`) ?? undefined;
      if (!paymentRef) return;
    } else if (to === "refunded" || to === "cancelled") {
      note = window.prompt(`Motif (${to === "refunded" ? "remboursement" : "annulation"} de ${o.number}) :`) ?? undefined;
      if (!note) return;
    }
    try {
      await adminFetch("/api/admin/orders", { method: "POST", body: { orderId: o._id, status: to, paymentRef, note } });
      setMsg({ tone: "green", text: `${o.number} : ${t.status[to] ?? to}.` });
      reload();
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    }
  }

  return (
    <section className={ui.card}>
      <nav className={ui.tabs} style={{ marginBottom: 12 }}>
        {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded", ""].map((s) => (
          <button key={s || "all"} type="button" className={ui.tab} data-active={status === s} onClick={() => { setStatus(s); setPage(1); }}>
            {s ? t.status[s] : "Toutes"}
          </button>
        ))}
      </nav>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {error ? <Notice tone="red">{error}</Notice> : null}
      {!data || loading ? (
        <div className={ui.skeleton} style={{ height: 200 }} />
      ) : data.items.length === 0 ? (
        <EmptyState icon="receipt">Aucune commande.</EmptyState>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Commande</th>
                <th>Client</th>
                <th>Articles</th>
                <th className={ui.num}>Total</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o._id}>
                  <td>
                    <strong className="num">{o.number}</strong>
                    <div className={ui.rowMeta}>{formatDate(o.createdAt)}</div>
                    {o.affiliate ? <div className={ui.rowMeta}>Affilié : {o.affiliate.member}</div> : null}
                  </td>
                  <td>
                    {o.buyer ?? o.guest?.name}
                    <div className={ui.rowMeta}>
                      {o.guest?.phone} {o.shipping ? `· ${o.shipping.city}` : ""}
                    </div>
                  </td>
                  <td className={ui.rowMeta}>
                    {o.items.map((l) => (
                      <div key={l.name}>{l.qty} × {l.name}</div>
                    ))}
                  </td>
                  <td className={ui.num}>{formatFcfa(o.total)}</td>
                  <td>
                    <StatusPill status={o.status} />
                    <div className={ui.rowMeta} style={{ marginTop: 4 }}>
                      <StatusPill status={o.paymentStatus} />
                      {o.paymentRef ? <span>{o.paymentRef}</span> : null}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {(NEXT[o.status] ?? []).map((n) => (
                      <button key={n.to} className={`${ui.btn} ${ui.btnSmall} ${n.danger ? ui.btnGhost : ""}`} style={{ marginRight: 4 }} onClick={() => move(o, n.to)}>
                        {n.label}
                      </button>
                    ))}
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
          <span>Page {page}</span>
          <button className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`} disabled={page * data.perPage >= data.total} onClick={() => setPage(page + 1)}>Suivant</button>
        </div>
      ) : null}
    </section>
  );
}
