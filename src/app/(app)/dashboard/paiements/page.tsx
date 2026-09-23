import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { Payout, type BonusType } from "@/lib/models";
import { paymentHistory } from "@/lib/services/dashboard";
import { getRules } from "@/lib/services/rules";
import { earningsByType, getWallet } from "@/lib/services/wallet";
import { t } from "@/i18n/fr";
import { formatDate, formatFcfa, formatSignedFcfa } from "@/lib/format";
import { WithdrawForm } from "@/components/portal/WithdrawForm";
import { EmptyState, PageHead, Pager, StatCard, StatusPill, ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Paiements" };
export const dynamic = "force-dynamic";

const FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Tout" },
  { id: "DIRECT_SPONSORSHIP", label: "Parrainage" },
  { id: "BINARY", label: "Binaire" },
  { id: "FAST_CUMULATION", label: "Fast Cumulation" },
  { id: "AFFILIATE_COMMISSION", label: "Commissions" },
  { id: "PAYOUT", label: "Retraits" },
];

type Search = Promise<Record<string, string | undefined>>;

export default async function PaymentsPage({ searchParams }: { searchParams: Search }) {
  const me = await currentMember();
  if (!me) redirect("/login");
  const sp = await searchParams;
  const type = FILTERS.some((f) => f.id === sp.type && f.id) ? (sp.type as BonusType | "PAYOUT") : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [wallet, earnings, history, open, rules] = await Promise.all([
    getWallet(me.memberCode),
    earningsByType(me.memberCode),
    paymentHistory(me.memberCode, { page, perPage: 20, type }),
    Payout.find({ member: me.memberCode, status: { $in: ["pending", "processing"] } }).sort({ createdAt: -1 }).lean(),
    getRules(),
  ]);
  const byType = (k: string) => earnings[k]?.approved ?? 0;
  const other = (earnings.AWARD?.approved ?? 0) + (earnings.ADJUSTMENT?.approved ?? 0);

  return (
    <div className={ui.page}>
      <PageHead title={t.nav.payments} sub="Votre solde, vos gains par type et l'historique de chaque mouvement." />

      <div className={ui.grid4}>
        <StatCard icon="wallet" label={t.stats.available} value={formatFcfa(wallet.available)} tone="green" />
        <StatCard icon="refresh" label={t.stats.pending} value={formatFcfa(wallet.pending + wallet.locked)} hint={`${formatFcfa(wallet.pending)} bonus · ${formatFcfa(wallet.locked)} retraits en cours`} tone="gold" />
        <StatCard icon="chart" label={t.stats.earned} value={formatFcfa(wallet.lifetime)} tone="blue" />
        <StatCard icon="receipt" label={t.stats.withdrawn} value={formatFcfa(wallet.withdrawn)} tone="navy" />
      </div>

      <div className={ui.split}>
        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Gains par type</h2>
          <dl className={ui.kv}>
            <dt>Parrainage direct</dt>
            <dd>{formatFcfa(byType("DIRECT_SPONSORSHIP"))}</dd>
            <dt>Bonus binaire</dt>
            <dd>{formatFcfa(byType("BINARY"))}</dd>
            <dt>Fast Cumulation</dt>
            <dd>{formatFcfa(byType("FAST_CUMULATION"))}</dd>
            <dt>Commissions marketplace</dt>
            <dd>{formatFcfa(byType("AFFILIATE_COMMISSION"))}</dd>
            <dt>Autres bonus</dt>
            <dd>{formatFcfa(other)}</dd>
          </dl>
          {open.length ? (
            <>
              <h3 className={ui.sectionTitle} style={{ marginTop: 20 }}>Retraits en cours</h3>
              <div className={ui.list}>
                {open.map((p) => (
                  <div className={ui.row} key={String(p._id)}>
                    <div>
                      <div className={ui.rowTitle}>{p.reference}</div>
                      <div className={ui.rowMeta}>
                        <span>{p.destination}</span>
                        <span>{formatDate(p.createdAt)}</span>
                        <StatusPill status={p.status} />
                      </div>
                    </div>
                    <div className={ui.rowAmount}>{formatFcfa(p.amount)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Demander un retrait</h2>
          <WithdrawForm
            available={wallet.available}
            minPayout={rules.minPayout}
            disabledReason={me.status !== "active" ? "Votre pack doit être activé avant de pouvoir retirer vos gains." : undefined}
          />
        </section>
      </div>

      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Historique des paiements</h2>
        <nav className={ui.tabs} aria-label="Filtrer" style={{ marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <Link key={f.id || "all"} href={f.id ? `/dashboard/paiements?type=${f.id}` : "/dashboard/paiements"} className={ui.tab} data-active={(type ?? "") === f.id}>
              {f.label}
            </Link>
          ))}
        </nav>
        {history.items.length === 0 ? (
          <EmptyState icon="receipt">{t.empty.history}</EmptyState>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Statut</th>
                  <th className={ui.num}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.createdAt)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{t.bonusTypes[r.type] ?? r.type}</td>
                    <td>
                      {r.description}
                      <div className={ui.rowMeta}>
                        <span className="num">Réf. {r.kind === "payout" ? r.reference : r.id.slice(-8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td className={`${ui.num} ${r.amount < 0 || r.status === "reversed" ? ui.neg : ui.pos}`}>
                      {formatSignedFcfa(r.status === "reversed" ? -Math.abs(r.amount) : r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} total={history.total} perPage={20} href={(p) => `/dashboard/paiements?${type ? `type=${type}&` : ""}page=${p}`} />
      </section>
    </div>
  );
}
