import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { BonusEntry, type BonusType } from "@/lib/models";
import { getBinaryState } from "@/lib/services/binary";
import { fastCumulationProgress } from "@/lib/services/fastCumulation";
import { getRules } from "@/lib/services/rules";
import { t } from "@/i18n/fr";
import { formatBps, formatDate, formatFcfa, formatNumber, formatPv, formatSignedFcfa } from "@/lib/format";
import type { PackageId } from "@/lib/plan";
import { applyBps } from "@/lib/money";
import { EmptyState, Notice, PageHead, Pager, ProgressBar, StatCard, StatusPill, ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Bonus" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "direct", label: "Parrainage direct", types: ["DIRECT_SPONSORSHIP"] },
  { id: "binary", label: "Bonus binaire", types: ["BINARY"] },
  { id: "fast", label: "Fast Cumulation", types: ["FAST_CUMULATION"] },
  { id: "affiliate", label: "Commissions marketplace", types: ["AFFILIATE_COMMISSION"] },
  { id: "other", label: "Autres bonus", types: ["AWARD", "ADJUSTMENT"] },
] as const satisfies readonly { id: string; label: string; types: readonly BonusType[] }[];

type Search = Promise<Record<string, string | undefined>>;

export default async function BonusPage({ searchParams }: { searchParams: Search }) {
  const me = await currentMember();
  if (!me) redirect("/login");
  const sp = await searchParams;
  const tab = TABS.find((x) => x.id === sp.tab) ?? TABS[0];
  const page = Math.max(1, Number(sp.page) || 1);
  const perPage = 15;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const filter = { member: me.memberCode, type: { $in: [...tab.types] } };

  const [rules, items, total, totals, month] = await Promise.all([
    getRules(),
    BonusEntry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    BonusEntry.countDocuments(filter),
    BonusEntry.aggregate([{ $match: filter }, { $group: { _id: "$status", total: { $sum: "$amount" }, n: { $sum: 1 } } }]),
    BonusEntry.aggregate([
      { $match: { ...filter, status: { $ne: "reversed" }, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" }, n: { $sum: 1 } } },
    ]),
  ]);
  const sum = (s: string) => totals.find((x) => x._id === s)?.total ?? 0;
  const pkg = rules.packages[me.packageId as PackageId];

  const extra =
    tab.id === "binary" ? await getBinaryState(me.memberCode) : null;
  const fast = tab.id === "fast" ? await fastCumulationProgress(me.memberCode) : null;

  return (
    <div className={ui.page}>
      <PageHead title={t.nav.bonus} sub="Chaque montant est calculé par DHI et enregistré avec son origine." />

      <nav className={ui.tabs} aria-label="Types de bonus">
        {TABS.map((x) => (
          <Link key={x.id} href={`/dashboard/bonus?tab=${x.id}`} className={ui.tab} data-active={x.id === tab.id}>
            {x.label}
          </Link>
        ))}
      </nav>

      <div className={ui.grid4}>
        <StatCard icon="gift" label="Total crédité" value={formatFcfa(sum("approved"))} hint={`${totals.reduce((n, x) => n + x.n, 0)} opérations`} />
        <StatCard icon="refresh" label="En attente" value={formatFcfa(sum("pending"))} tone="gold" />
        <StatCard icon="chart" label="Ce mois-ci" value={formatFcfa(month[0]?.total ?? 0)} hint={`${month[0]?.n ?? 0} opérations`} tone="blue" />
        <StatCard icon="close" label="Annulé" value={formatFcfa(sum("reversed"))} tone="navy" />
      </div>

      {/* How this bonus is calculated */}
      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Calcul</h2>
        {tab.id === "direct" ? (
          <p className={ui.pageSub} style={{ margin: 0 }}>
            Pour chaque personne que vous parrainez personnellement, vous recevez{" "}
            <strong>{formatBps(pkg.directBps)}</strong> (votre pack {pkg.name}) de la valeur PV de son
            pack, au moment où son paiement est confirmé. Exemple : un pack Index (75 PV ={" "}
            {formatFcfa(75 * rules.pvValue)}) vous rapporte {formatFcfa(applyBps(75 * rules.pvValue, pkg.directBps))}.
          </p>
        ) : tab.id === "binary" && extra ? (
          <div className={ui.formGrid}>
            <div className={ui.grid4}>
              <StatCard icon="network" label="PV gauche (report)" value={formatPv(extra.carryLeft)} hint={`Cumul ${formatNumber(extra.totalLeft)}`} />
              <StatCard icon="network" label="PV droite (report)" value={formatPv(extra.carryRight)} hint={`Cumul ${formatNumber(extra.totalRight)}`} tone="blue" />
              <StatCard icon="check" label="PV appariés" value={formatPv(extra.matchedPv)} hint={`${extra.pairs} paires`} tone="gold" />
              <StatCard icon="pv" label="Pourcentage" value={formatBps(pkg.binaryBps)} hint={`${formatFcfa(applyBps(rules.pairPv * rules.pvValue, pkg.binaryBps))} par paire`} tone="purple" />
            </div>
            <p className={ui.pageSub} style={{ margin: 0 }}>
              {rules.pairPv} PV à gauche + {rules.pairPv} PV à droite = 1 paire. Seules les paires
              complètes sont payées ; le volume non apparié reste en report sur sa branche. Seul le
              volume des {rules.generationLimit} premières générations compte.
            </p>
          </div>
        ) : tab.id === "fast" && fast ? (
          <div className={ui.formGrid}>
            <ProgressBar
              label="Personnes actives dans les 8 générations"
              value={`${formatNumber(fast.active)} / ${formatNumber(fast.required)}`}
              ratio={fast.ratio}
              tone="purple"
            />
            {fast.reachedAt ? (
              <Notice tone="green" icon="check" title="Fast Cumulation débloqué">
                Atteint le {formatDate(fast.reachedAt)}.
                {fast.amount > 0 ? ` Montant : ${formatFcfa(fast.amount)}.` : " Le montant sera confirmé par DHI."}
              </Notice>
            ) : (
              <p className={ui.pageSub} style={{ margin: 0 }}>
                Le Fast Cumulation est distinct du bonus binaire : il récompense une structure
                complète jusqu&apos;à la fin de la {rules.generationLimit}e génération ({formatNumber(fast.required)} personnes
                actives). {fast.amount > 0 ? `Montant : ${formatFcfa(fast.amount)}.` : "Le montant est communiqué par DHI."}
              </p>
            )}
          </div>
        ) : tab.id === "affiliate" ? (
          <p className={ui.pageSub} style={{ margin: 0 }}>
            Partagez un produit de la marketplace avec votre lien. Vous touchez{" "}
            <strong>{formatBps(rules.affiliateBps)}</strong> du montant payé (taux propre à certains
            produits). La commission est <em>en attente</em> dès le paiement, puis{" "}
            <em>créditée</em> à la livraison ; elle est annulée si la commande est remboursée.{" "}
            <Link href="/dashboard/affiliation" className={ui.sectionLink}>Mes performances</Link>
          </p>
        ) : (
          <p className={ui.pageSub} style={{ margin: 0 }}>
            Récompenses d&apos;Awards versées en argent et ajustements effectués par DHI, chacun avec
            son motif.
          </p>
        )}
      </section>

      {/* History */}
      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Historique</h2>
        {items.length === 0 ? (
          <EmptyState icon="gift">{t.empty.bonuses}</EmptyState>
        ) : (
          <div className={ui.list}>
            {items.map((b) => {
              const d = b.details as Record<string, number | string | null>;
              return (
                <div key={String(b._id)} className={ui.row}>
                  <div>
                    <div className={ui.rowTitle}>{b.description}</div>
                    <div className={ui.rowMeta}>
                      <span>{formatDate(b.createdAt)}</span>
                      <StatusPill status={b.status} />
                      {b.rateBps ? <span>{formatBps(b.rateBps)}</span> : null}
                      {b.type === "BINARY" ? (
                        <span>
                          G {d.leftBefore} / D {d.rightBefore} PV → {d.matchedPv} PV appariés → report G {d.carryLeftAfter} / D {d.carryRightAfter}
                        </span>
                      ) : null}
                      {b.type === "DIRECT_SPONSORSHIP" ? (
                        <span>
                          {d.recruitPv} PV × {formatFcfa(Number(d.pvValue))} × {formatBps(b.rateBps)}
                        </span>
                      ) : null}
                      {b.status === "pending" && d.pendingReason === "sponsor_inactive" ? <span>Crédité à l&apos;activation de votre pack</span> : null}
                      {b.status === "pending" && d.pendingReason === "order_undelivered" ? <span>Crédité à la livraison</span> : null}
                    </div>
                  </div>
                  <div className={`${ui.rowAmount} ${b.status === "reversed" ? ui.neg : ui.pos}`}>
                    {formatSignedFcfa(b.status === "reversed" ? -b.amount : b.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pager page={page} total={total} perPage={perPage} href={(p) => `/dashboard/bonus?tab=${tab.id}&page=${p}`} />
      </section>
    </div>
  );
}
