import Link from "next/link";
import { t } from "@/i18n/fr";
import { formatBps, formatFcfa } from "@/lib/format";
import { applyBps } from "@/lib/money";
import { QuickAdd } from "./AddToCart";
import { ProductImage } from "./ProductImage";
import { Stars } from "./Stars";
import s from "./marketplace.module.css";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  image: string | null;
  stock: number;
  price: number;
  discountBps: number;
  finalPrice: number;
  affiliateBps: number;
  rating: { average: number; count: number };
};

/** One product: price for this viewer, stock, and — for members — what sharing it pays. */
export function ProductCard({ p, showCommission }: { p: CardProduct; showCommission: boolean }) {
  const out = p.stock <= 0;
  return (
    <article className={s.card}>
      <Link href={`/marketplace/${p.slug}`} className={s.cardMedia} tabIndex={-1} aria-hidden="true">
        <ProductImage src={p.image} alt="" category={p.category} />
        {p.discountBps > 0 ? <span className={s.discountTag}>−{formatBps(p.discountBps)}</span> : null}
      </Link>
      <div className={s.cardBody}>
        <span className={s.cardCat}>{p.categoryName}</span>
        <h3 className={s.cardTitle}>
          <Link href={`/marketplace/${p.slug}`}>{p.name}</Link>
        </h3>
        {p.rating.count > 0 ? <Stars value={p.rating.average} count={p.rating.count} /> : null}
        <div className={s.stock} data-out={out} data-low={!out && p.stock <= 3}>
          {out ? t.marketplace.outOfStock : p.stock <= 3 ? t.marketplace.lowStock(p.stock) : t.marketplace.inStock}
        </div>
        <div className={s.priceRow}>
          <strong className={`${s.price} num`}>{formatFcfa(p.finalPrice)}</strong>
          {p.discountBps > 0 ? <s className={`${s.was} num`}>{formatFcfa(p.price)}</s> : null}
        </div>
        {p.discountBps > 0 ? <span className={s.memberNote}>{t.marketplace.memberPrice}</span> : null}
        {showCommission ? (
          <span className={s.commission}>
            {t.marketplace.commission} {formatBps(p.affiliateBps)} ≈ {formatFcfa(applyBps(p.price, p.affiliateBps))}
          </span>
        ) : null}
        <div className={s.cardActions}>
          <Link href={`/marketplace/${p.slug}`} className={s.seeLink}>
            {t.marketplace.see}
          </Link>
          <QuickAdd productId={p.id} disabled={out} />
        </div>
      </div>
    </article>
  );
}
