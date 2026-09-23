import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { AffiliateClick, BonusEntry, Category, Order } from "@/lib/models";
import { canReview, getProduct, listReviews, reviewSummary } from "@/lib/services/catalog";
import { productPriceFor } from "@/lib/services/orders";
import { getRules } from "@/lib/services/rules";
import { productLink, siteOrigin } from "@/lib/origin";
import { applyBps } from "@/lib/money";
import { t } from "@/i18n/fr";
import { formatBps, formatDate, formatFcfa, formatNumber, formatPv } from "@/lib/format";
import { Icon } from "@/components/portal/Icon";
import { CopyButton, ShareButtons } from "@/components/portal/Share";
import { EmptyState, Pill, ui } from "@/components/portal/ui";
import { BuyBox } from "@/components/marketplace/AddToCart";
import { ClickTracker } from "@/components/marketplace/ClickTracker";
import { Gallery } from "@/components/marketplace/Gallery";
import { ReviewForm } from "@/components/marketplace/ReviewForm";
import { Stars } from "@/components/marketplace/Stars";
import s from "@/components/marketplace/marketplace.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return p ? { title: p.name, description: p.summary || t.marketplace.hero } : { title: "Produit introuvable" };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [me, rules, category, summary, reviews, origin] = await Promise.all([
    currentMember(),
    getRules(),
    Category.findOne({ slug: product.category }).lean(),
    reviewSummary(slug),
    listReviews(slug, 10),
    siteOrigin(),
  ]);
  const price = productPriceFor(product.price, me, rules);
  const affiliateBps = product.affiliateBps ?? rules.affiliateBps;
  const isAffiliate = me?.status === "active";
  const ref = sp.ref?.toUpperCase();
  const trackRef = ref && /^DHI-[A-Z0-9]{4,10}$/.test(ref) && ref !== me?.memberCode ? ref : null;

  // This member's own results for this product.
  const perf = isAffiliate
    ? await (async () => {
        const [clicks, orders] = await Promise.all([
          AffiliateClick.countDocuments({ affiliate: me!.memberCode, product: slug, duplicate: false }),
          Order.find({ "affiliate.member": me!.memberCode, "items.slug": slug, paymentStatus: { $in: ["paid", "refunded"] } }).select("_id paymentStatus").lean(),
        ]);
        const commissions = await BonusEntry.aggregate([
          { $match: { key: { $in: orders.map((o) => `affiliate:${o._id}`) }, status: { $ne: "reversed" } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        return { clicks, sales: orders.filter((o) => o.paymentStatus === "paid").length, commission: commissions[0]?.total ?? 0 };
      })()
    : null;
  const review = me ? await canReview(me.memberCode, slug) : null;
  const shareUrl = me ? productLink(origin, slug, me.memberCode) : productLink(origin, slug);

  return (
    <div className={ui.page}>
      {trackRef ? <ClickTracker refCode={trackRef} slug={slug} /> : null}

      <nav className={s.crumbs} aria-label="Fil d'Ariane">
        <Link href="/marketplace">{t.marketplace.title}</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/marketplace?cat=${product.category}`}>{category?.name ?? product.category}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className={s.detail}>
        <Gallery images={product.images} name={product.name} category={product.category} />

        <div className={s.info}>
          <div className={s.tags}>
            <Pill tone={product.stock > 0 ? "green" : "red"}>
              {product.stock > 0 ? `${t.marketplace.inStock} · ${product.stock}` : t.marketplace.outOfStock}
            </Pill>
            <Pill tone="blue">{category?.name ?? product.category}</Pill>
            {product.pv > 0 && me ? <Pill tone="purple">{formatPv(product.pv)}</Pill> : null}
          </div>
          <h1 className={s.infoTitle}>{product.name}</h1>
          {summary.count > 0 ? <Stars value={summary.average} count={summary.count} /> : <span className={ui.pageSub} style={{ margin: 0 }}>{t.empty.reviews}</span>}
          {product.summary ? <p className={ui.pageSub} style={{ margin: 0 }}>{product.summary}</p> : null}

          <div className={s.priceBox}>
            <span className={s.bigPrice}>{formatFcfa(price.finalPrice)}</span>
            {price.discountBps > 0 ? (
              <>
                <div className={s.priceLine}>
                  <span>Prix public</span>
                  <s className="num">{formatFcfa(price.price)}</s>
                </div>
                <div className={s.priceLine}>
                  <span>{t.marketplace.yourDiscount(formatBps(price.discountBps))}</span>
                  <span className={`num ${ui.pos}`}>−{formatFcfa(price.discount)}</span>
                </div>
              </>
            ) : me && me.status !== "active" ? (
              <span className={ui.rowMeta}>Votre remise membre s&apos;appliquera dès l&apos;activation de votre pack.</span>
            ) : !me ? (
              <span className={ui.rowMeta}>
                <Link href="/login">Connectez-vous</Link> pour votre prix membre.
              </span>
            ) : null}
          </div>

          <BuyBox productId={String(product._id)} stock={product.stock} />

          <div className={s.facts}>
            {product.delivery ? (
              <div className={s.fact}>
                <Icon name="truck" size={20} />
                <div>
                  <strong>{t.marketplace.delivery}</strong>
                  <span>{product.delivery}</span>
                </div>
              </div>
            ) : null}
            {product.warranty ? (
              <div className={s.fact}>
                <Icon name="shield" size={20} />
                <div>
                  <strong>{t.marketplace.warranty}</strong>
                  <span>{product.warranty}</span>
                </div>
              </div>
            ) : null}
            {product.returns ? (
              <div className={s.fact}>
                <Icon name="refresh" size={20} />
                <div>
                  <strong>{t.marketplace.returns}</strong>
                  <span>{product.returns}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Share & earn */}
          {isAffiliate && perf ? (
            <section className={s.share} aria-label={t.marketplace.shareEarn}>
              <span className={s.shareTitle}>
                <Icon name="share" size={20} />
                {t.marketplace.shareEarn.toUpperCase()}
              </span>
              <div className={s.shareFigures}>
                <div>
                  <span>{t.marketplace.myCommission}</span>
                  <strong>{t.marketplace.perSale(formatBps(affiliateBps))}</strong>
                </div>
                <div>
                  <span>{t.marketplace.estimated}</span>
                  <strong>{formatFcfa(applyBps(product.price, affiliateBps))}</strong>
                </div>
              </div>
              <div className={s.shareLink}>{shareUrl}</div>
              <ShareButtons url={shareUrl} message={`${product.name} sur DHI Marketplace :`} />
              <div>
                <span className={s.shareTitle} style={{ fontSize: "var(--t-s)" }}>{t.marketplace.myPerformance}</span>
                <div className={s.perf} style={{ marginTop: 8 }}>
                  <div>
                    <span>{t.marketplace.clicks}</span>
                    <strong>{formatNumber(perf.clicks)}</strong>
                  </div>
                  <div>
                    <span>{t.marketplace.sales}</span>
                    <strong>{formatNumber(perf.sales)}</strong>
                  </div>
                  <div>
                    <span>{t.marketplace.commissions}</span>
                    <strong>{formatFcfa(perf.commission)}</strong>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className={ui.card}>
              <h2 className={ui.sectionTitle}>{t.marketplace.shareEarn}</h2>
              <p className={ui.pageSub} style={{ marginTop: 0 }}>
                {me
                  ? "Votre lien de partage sera actif dès l'activation de votre pack."
                  : `Les membres DHI gagnent ${formatBps(affiliateBps)} sur chaque vente réalisée avec leur lien.`}
              </p>
              <CopyButton text={shareUrl} label="Copier le lien du produit" small />
            </section>
          )}
        </div>
      </div>

      <div className={ui.split}>
        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>{t.marketplace.characteristics}</h2>
          {product.characteristics.length ? (
            <ul className={s.charList}>
              {product.characteristics.map((c) => (
                <li key={c}>
                  <Icon name="check" size={16} />
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
          {product.description && product.description !== product.summary ? (
            <p className={ui.pageSub} style={{ whiteSpace: "pre-line" }}>{product.description}</p>
          ) : null}
        </section>

        <section className={ui.card} id="avis">
          <h2 className={ui.sectionTitle}>
            Avis clients
            {summary.count > 0 ? <Stars value={summary.average} count={summary.count} /> : null}
          </h2>
          {reviews.length === 0 ? (
            <EmptyState icon="star">{t.empty.reviews}</EmptyState>
          ) : (
            <div className={ui.list}>
              {reviews.map((r) => (
                <div key={String(r._id)} className={ui.row} style={{ gridTemplateColumns: "1fr" }}>
                  <div>
                    <div className={ui.rowTitle}>
                      <span style={{ color: "var(--gold)" }}>{"★".repeat(r.rating)}</span>
                      <span style={{ color: "#d6d9e5" }}>{"★".repeat(5 - r.rating)}</span> {r.memberName}
                    </div>
                    {r.body ? <p style={{ margin: "4px 0 0", fontSize: "var(--t-s)" }}>{r.body}</p> : null}
                    <div className={ui.rowMeta}>{formatDate(r.createdAt)} · Achat vérifié</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {review?.bought && !review.alreadyReviewed ? (
            <div style={{ marginTop: 16 }}>
              <ReviewForm slug={slug} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
