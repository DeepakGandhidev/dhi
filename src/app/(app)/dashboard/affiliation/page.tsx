import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { BonusEntry, Product } from "@/lib/models";
import { affiliateStats } from "@/lib/services/affiliate";
import { getRules } from "@/lib/services/rules";
import { productLink, siteOrigin } from "@/lib/origin";
import { t } from "@/i18n/fr";
import { formatBps, formatDate, formatFcfa, formatNumber, formatRatio, formatSignedFcfa } from "@/lib/format";
import { CopyButton } from "@/components/portal/Share";
import { EmptyState, Notice, PageHead, Pager, StatCard, StatusPill, ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Partagez & gagnez" };
export const dynamic = "force-dynamic";

export default async function AffiliatePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await currentMember();
  if (!me) redirect("/login");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const filter = { member: me.memberCode, type: "AFFILIATE_COMMISSION" };
  const [stats, rules, origin, items, total] = await Promise.all([
    affiliateStats(me.memberCode),
    getRules(),
    siteOrigin(),
    BonusEntry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 15).limit(15).lean(),
    BonusEntry.countDocuments(filter),
  ]);
  const top = await Product.find({ slug: { $in: stats.topProducts.map((p) => p.slug) } }).select("slug name").lean();
  const names = new Map(top.map((p) => [p.slug, p.name]));

  return (
    <div className={ui.page}>
      <PageHead
        title={t.marketplace.shareEarn}
        sub={`Partagez un produit avec votre lien : ${formatBps(rules.affiliateBps)} de commission par vente livrée.`}
        action={
          <Link href="/marketplace" className={ui.btn}>
            Choisir un produit
          </Link>
        }
      />
      {me.status !== "active" ? (
        <Notice tone="gold">Vos liens seront actifs dès la confirmation de votre pack. Les clics sur un lien d&apos;un membre inactif ne sont pas attribués.</Notice>
      ) : null}

      <h2 className={ui.sectionTitle} style={{ margin: 0 }}>{t.marketplace.myPerformance}</h2>
      <div className={ui.grid4}>
        <StatCard icon="link" label={t.marketplace.clicks} value={formatNumber(stats.clicks)} hint={`${stats.uniqueVisitors} visiteurs uniques`} tone="blue" />
        <StatCard icon="receipt" label={t.marketplace.sales} value={formatNumber(stats.sales)} hint={`Conversion ${formatRatio(stats.conversionRate)}`} />
        <StatCard icon="gift" label={t.marketplace.commissions} value={formatFcfa(stats.commissionTotal)} hint={`${formatFcfa(stats.commissionApproved)} créditées`} tone="gold" />
        <StatCard icon="refresh" label="En attente de livraison" value={formatFcfa(stats.commissionPending)} hint={stats.commissionReversed ? `${formatFcfa(stats.commissionReversed)} annulées` : undefined} tone="navy" />
      </div>

      <div className={ui.split}>
        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Commissions</h2>
          {items.length === 0 ? (
            <EmptyState icon="gift">Aucune vente pour le moment. Partagez un produit pour commencer.</EmptyState>
          ) : (
            <div className={ui.list}>
              {items.map((b) => (
                <div key={String(b._id)} className={ui.row}>
                  <div>
                    <div className={ui.rowTitle}>{b.description}</div>
                    <div className={ui.rowMeta}>
                      <span>{formatDate(b.createdAt)}</span>
                      <StatusPill status={b.status} label={b.status === "pending" ? "En attente de livraison" : undefined} />
                    </div>
                  </div>
                  <div className={`${ui.rowAmount} ${b.status === "reversed" ? ui.neg : ui.pos}`}>
                    {formatSignedFcfa(b.status === "reversed" ? -b.amount : b.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pager page={page} total={total} perPage={15} href={(p) => `/dashboard/affiliation?page=${p}`} />
        </section>

        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Produits les plus cliqués</h2>
          {stats.topProducts.length === 0 ? (
            <p className={ui.pageSub}>Vos liens n&apos;ont pas encore été ouverts.</p>
          ) : (
            <div className={ui.list}>
              {stats.topProducts.map((p) => (
                <div key={p.slug} className={ui.row}>
                  <div>
                    <div className={ui.rowTitle}>
                      <Link href={`/marketplace/${p.slug}`}>{names.get(p.slug) ?? p.slug}</Link>
                    </div>
                    <div className={ui.rowMeta}>{p.clicks} clics</div>
                  </div>
                  <CopyButton text={productLink(origin, p.slug, me.memberCode)} label="Lien" small />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
