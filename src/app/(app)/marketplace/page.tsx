import type { Metadata } from "next";
import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { listCategories, listProducts, reviewSummaries } from "@/lib/services/catalog";
import { productPriceFor } from "@/lib/services/orders";
import { getRules } from "@/lib/services/rules";
import { t } from "@/i18n/fr";
import { formatBps } from "@/lib/format";
import type { PackageId } from "@/lib/plan";
import { Icon } from "@/components/portal/Icon";
import { EmptyState, Pager, ui } from "@/components/portal/ui";
import { ProductCard, type CardProduct } from "@/components/marketplace/ProductCard";
import s from "@/components/marketplace/marketplace.module.css";

export const metadata: Metadata = {
  title: "DHI Marketplace",
  description: t.marketplace.hero,
  robots: { index: true, follow: true },
};
export const dynamic = "force-dynamic";

const SORTS = [
  { id: "new", label: "Nouveautés" },
  { id: "price_asc", label: "Prix croissant" },
  { id: "price_desc", label: "Prix décroissant" },
] as const;

type Search = Promise<Record<string, string | undefined>>;

export default async function MarketplacePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const category = sp.cat ?? "";
  const sort = SORTS.find((x) => x.id === sp.sort)?.id ?? "new";
  const page = Math.max(1, Number(sp.page) || 1);

  const [me, rules, categories, list] = await Promise.all([
    currentMember(),
    getRules(),
    listCategories(),
    listProducts({ q, category: category || undefined, sort, page, perPage: 24 }),
  ]);
  const reviews = await reviewSummaries(list.items.map((p) => p.slug));
  const catName = new Map(categories.map((c) => [c.slug, c.name]));
  const memberDiscount = me?.status === "active" ? rules.packages[me.packageId as PackageId].discountBps : 0;

  const products: CardProduct[] = list.items.map((p) => ({
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    category: p.category,
    categoryName: catName.get(p.category) ?? p.category,
    image: p.images[0] ?? null,
    stock: p.stock,
    ...productPriceFor(p.price, me, rules),
    affiliateBps: p.affiliateBps ?? rules.affiliateBps,
    rating: reviews.get(p.slug) ?? { average: 0, count: 0 },
  }));

  const href = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const all: Record<string, string | number | undefined> = { q: q || undefined, cat: category || undefined, sort: sort === "new" ? undefined : sort, page: undefined, ...over };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) params.set(k, String(v));
    const qs = params.toString();
    return `/marketplace${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className={ui.page}>
      <section className={s.hero}>
        <span className={s.heroEyebrow}>
          <Icon name="store" size={18} />
          {t.marketplace.title}
        </span>
        <h1 className={s.heroTitle}>{t.marketplace.hero}</h1>
        <form className={s.search} action="/marketplace" role="search">
          {category ? <input type="hidden" name="cat" value={category} /> : null}
          <input name="q" defaultValue={q} placeholder={t.marketplace.search} aria-label={t.marketplace.search} maxLength={80} />
          <button className={`${ui.btn} ${ui.btnGold}`} type="submit" aria-label="Rechercher">
            <Icon name="search" size={18} />
          </button>
        </form>
        {memberDiscount > 0 ? (
          <p className={s.memberBar}>Votre remise membre de {formatBps(memberDiscount)} est déjà appliquée aux prix affichés.</p>
        ) : !me ? (
          <p className={s.memberBar}>
            Membre DHI ? <Link href="/login" style={{ color: "var(--gold)" }}>Connectez-vous</Link> pour voir vos prix membre.
          </p>
        ) : null}
      </section>

      <nav className={s.chips} aria-label="Catégories">
        <Link href={href({ cat: undefined })} className={ui.tab} data-active={!category}>
          {t.marketplace.all}
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={href({ cat: c.slug })} className={ui.tab} data-active={category === c.slug}>
            {c.name}
          </Link>
        ))}
      </nav>

      <div className={s.toolbar}>
        <span className={s.count}>
          {list.total} produit{list.total > 1 ? "s" : ""}
          {q ? ` pour « ${q} »` : ""}
        </span>
        <nav className={ui.tabs} aria-label="Trier">
          {SORTS.map((x) => (
            <Link key={x.id} href={href({ sort: x.id === "new" ? undefined : x.id })} className={ui.tab} data-active={sort === x.id}>
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      {products.length === 0 ? (
        <section className={ui.card}>
          <EmptyState
            icon="search"
            action={
              q || category ? (
                <Link href="/marketplace" className={`${ui.btn} ${ui.btnGhost}`}>
                  Voir tous les produits
                </Link>
              ) : undefined
            }
          >
            {q || category ? t.empty.products : "La boutique n'a pas encore de produits."}
          </EmptyState>
        </section>
      ) : (
        <div className={s.grid}>
          {products.map((p) => (
            <ProductCard key={p.id} p={p} showCommission={me?.status === "active"} />
          ))}
        </div>
      )}

      <Pager page={page} total={list.total} perPage={24} href={(p) => href({ page: p })} />
    </div>
  );
}
