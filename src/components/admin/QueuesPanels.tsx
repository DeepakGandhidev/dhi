"use client";

import { useState } from "react";
import { t } from "@/i18n/fr";
import { formatDate } from "@/lib/format";
import { AWARD_BY_ID, type AwardId } from "@/lib/plan";
import { EmptyState, Notice, StatusPill, ui } from "@/components/portal/ui";
import { adminFetch, useAdminData } from "./useAdmin";

type Review = { _id: string; product: string; member: string; memberName: string; rating: number; body: string; status: string; createdAt: string };

export function ReviewsPanel() {
  const [status, setStatus] = useState("pending");
  const { data, error, loading, reload } = useAdminData<{ items: Review[] }>(`/api/admin/reviews?status=${status}`);
  const [msg, setMsg] = useState<string | null>(null);

  async function moderate(id: string, to: "approved" | "rejected") {
    try {
      await adminFetch("/api/admin/reviews", { method: "POST", body: { id, status: to } });
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <section className={ui.card}>
      <nav className={ui.tabs} style={{ marginBottom: 12 }}>
        {["pending", "approved", "rejected"].map((s) => (
          <button key={s} type="button" className={ui.tab} data-active={status === s} onClick={() => setStatus(s)}>
            {s === "pending" ? "À modérer" : s === "approved" ? "Publiés" : "Refusés"}
          </button>
        ))}
      </nav>
      {msg || error ? <Notice tone="red">{msg ?? error}</Notice> : null}
      {!data || loading ? (
        <div className={ui.skeleton} style={{ height: 120 }} />
      ) : data.items.length === 0 ? (
        <EmptyState icon="star">Aucun avis.</EmptyState>
      ) : (
        <div className={ui.list}>
          {data.items.map((r) => (
            <div key={r._id} className={ui.row}>
              <div>
                <div className={ui.rowTitle}>
                  <span style={{ color: "var(--gold)" }}>{"★".repeat(r.rating)}</span> {r.product}
                </div>
                {r.body ? <p style={{ margin: "4px 0", fontSize: "var(--t-s)" }}>{r.body}</p> : null}
                <div className={ui.rowMeta}>
                  {r.memberName} ({r.member}) · {formatDate(r.createdAt)}
                </div>
              </div>
              {r.status === "pending" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={`${ui.btn} ${ui.btnSmall}`} onClick={() => moderate(r._id, "approved")}>Publier</button>
                  <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => moderate(r._id, "rejected")}>Refuser</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type Award = {
  _id: string;
  member: string;
  award: AwardId;
  unlockedAt: string;
  rewardStatus: string;
  deliveredAt: string | null;
  memberInfo: { fullName: string; phone: string } | null;
};

export function AwardsPanel({ onInspect }: { onInspect: (code: string) => void }) {
  const [status, setStatus] = useState("to_deliver");
  const { data, error, loading, reload } = useAdminData<{ items: Award[] }>(`/api/admin/awards?rewardStatus=${status}`);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className={ui.card}>
      <nav className={ui.tabs} style={{ marginBottom: 12 }}>
        {["to_deliver", "delivered"].map((s) => (
          <button key={s} type="button" className={ui.tab} data-active={status === s} onClick={() => setStatus(s)}>
            {s === "to_deliver" ? "Récompenses à remettre" : "Remises"}
          </button>
        ))}
      </nav>
      {msg || error ? <Notice tone="red">{msg ?? error}</Notice> : null}
      {!data || loading ? (
        <div className={ui.skeleton} style={{ height: 120 }} />
      ) : data.items.length === 0 ? (
        <EmptyState icon="trophy">Aucun Award dans cette liste.</EmptyState>
      ) : (
        <div className={ui.list}>
          {data.items.map((a) => (
            <div key={a._id} className={ui.row}>
              <div>
                <div className={ui.rowTitle}>
                  {AWARD_BY_ID[a.award].nameFr} — {AWARD_BY_ID[a.award].reward.join(", ")}
                </div>
                <div className={ui.rowMeta}>
                  <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => onInspect(a.member)}>{a.member}</button>
                  <span>{a.memberInfo?.fullName}</span>
                  <span>{a.memberInfo?.phone}</span>
                  <span>Débloqué le {formatDate(a.unlockedAt)}</span>
                  <StatusPill status={a.rewardStatus} label={t.status[a.rewardStatus]} />
                </div>
              </div>
              {a.rewardStatus === "to_deliver" ? (
                <button
                  className={`${ui.btn} ${ui.btnSmall}`}
                  onClick={async () => {
                    if (!window.confirm("Confirmer la remise de la récompense ?")) return;
                    try {
                      await adminFetch("/api/admin/awards", { method: "POST", body: { id: a._id } });
                      reload();
                    } catch (e) {
                      setMsg((e as Error).message);
                    }
                  }}
                >
                  Marquer remise
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
