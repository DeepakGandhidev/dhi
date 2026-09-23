"use client";

import { t } from "@/i18n/fr";
import { formatFcfa, formatNumber, formatPv } from "@/lib/format";
import { AWARD_BY_ID, type AwardId } from "@/lib/plan";
import { Notice, StatCard, ui } from "@/components/portal/ui";
import { useAdminData } from "./useAdmin";

type Stats = {
  members: { total: number; active: number; pending: number };
  pv: { total: number; byType: Record<string, number>; rootLeft: number; rootRight: number };
  bonuses: Record<string, Record<string, number>>;
  sales: Record<string, { total: number; n: number }>;
  payouts: Record<string, { total: number; n: number }>;
  awards: { award: AwardId; rewardStatus: string; n: number }[];
  queues: { pendingMembers: number; pendingOrders: number; pendingPayouts: number; pendingReviews: number };
};

export function Overview({ go }: { go: (tab: string) => void }) {
  const { data, error, loading } = useAdminData<Stats>("/api/admin/stats");
  if (error) return <Notice tone="red">{error}</Notice>;
  if (!data || loading) return <div className={ui.skeleton} style={{ height: 300 }} />;

  const sumBonus = (type: string, status = "approved") => data.bonuses[type]?.[status] ?? 0;
  const allBonuses = Object.values(data.bonuses).reduce((n, b) => n + (b.approved ?? 0), 0);
  const queue = [
    { n: data.queues.pendingMembers, label: "packs à confirmer", tab: "members" },
    { n: data.queues.pendingOrders, label: "commandes en attente", tab: "orders" },
    { n: data.queues.pendingPayouts, label: "retraits à traiter", tab: "payouts" },
    { n: data.queues.pendingReviews, label: "avis à modérer", tab: "reviews" },
  ];

  return (
    <div className={ui.page}>
      <div className={ui.grid4}>
        {queue.map((q) => (
          <button key={q.tab} type="button" className={`${ui.card} ${ui.stat}`} onClick={() => go(q.tab)} style={{ textAlign: "left", border: 0, cursor: "pointer", font: "inherit" }}>
            <span className={ui.statIcon} data-tone={q.n ? "gold" : "green"}>{q.n ? "!" : "✓"}</span>
            <span className={ui.statLabel}>{q.label}</span>
            <span className={ui.statValue}>{q.n}</span>
          </button>
        ))}
      </div>

      <div className={ui.grid4}>
        <StatCard icon="users" label="Membres" value={formatNumber(data.members.total)} hint={`${data.members.active} actifs · ${data.members.pending} en attente`} tone="blue" />
        <StatCard icon="pv" label="PV total" value={formatPv(data.pv.total)} hint={`Racine : ${formatNumber(data.pv.rootLeft)} G / ${formatNumber(data.pv.rootRight)} D`} />
        <StatCard icon="gift" label="Bonus générés" value={formatFcfa(allBonuses)} hint={`${formatFcfa(Object.values(data.bonuses).reduce((n, b) => n + (b.pending ?? 0), 0))} en attente`} tone="gold" />
        <StatCard icon="store" label="Ventes marketplace" value={formatFcfa(data.sales.marketplace?.total ?? 0)} hint={`${data.sales.marketplace?.n ?? 0} commandes payées`} tone="purple" />
      </div>

      <div className={ui.grid2}>
        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Bonus par type (crédités)</h2>
          <dl className={ui.kv}>
            {["DIRECT_SPONSORSHIP", "BINARY", "FAST_CUMULATION", "AFFILIATE_COMMISSION", "AWARD", "ADJUSTMENT"].map((k) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{t.bonusTypes[k]}</dt>
                <dd>{formatFcfa(sumBonus(k))}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Paiements et Awards</h2>
          <dl className={ui.kv}>
            <dt>Packs encaissés</dt>
            <dd>{formatFcfa(data.sales.package?.total ?? 0)}</dd>
            <dt>Retraits versés</dt>
            <dd>{formatFcfa(data.payouts.paid?.total ?? 0)}</dd>
            <dt>Retraits en attente</dt>
            <dd>{formatFcfa((data.payouts.pending?.total ?? 0) + (data.payouts.processing?.total ?? 0))}</dd>
            {data.awards.map((a) => (
              <div key={`${a.award}-${a.rewardStatus}`} style={{ display: "contents" }}>
                <dt>
                  {AWARD_BY_ID[a.award].nameFr} · {t.status[a.rewardStatus] ?? a.rewardStatus}
                </dt>
                <dd>{a.n}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
