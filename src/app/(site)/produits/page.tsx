import type { Metadata } from "next";
import Link from "next/link";
import { DHI_CATEGORIES, DHI_PRODUCTS, productImagePath } from "@/lib/dhiCatalog";
import { PRODUCT_DISCLAIMER, PRODUCT_INFO } from "@/lib/productInfo";
import { dbConfigured } from "@/lib/mongodb";
import { Product } from "@/lib/models";
import { ensureCatalog } from "@/lib/demoCatalog";
import { formatFcfa, formatPv } from "@/lib/format";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Nos produits",
  description: "La gamme Divine Health International : compléments alimentaires, thés, café et soins, avec leur rôle, leurs bienfaits, leur prix et leurs PV.",
};

export const dynamic = "force-dynamic";

type Live = { price: number; pv: number; image: string | null; status: string };

/** Current price, PV and photo from the store, so admin edits show here too. */
async function liveData(): Promise<Map<string, Live>> {
  if (!dbConfigured) return new Map();
  try {
    await ensureCatalog();
    const rows = await Product.find({ slug: { $in: DHI_PRODUCTS.map((p) => p.slug) } })
      .select("slug price pv images status")
      .lean();
    return new Map(rows.map((r) => [r.slug, { price: r.price, pv: r.pv, image: r.images[0] ?? null, status: r.status }]));
  } catch (err) {
    console.error("[produits] store unavailable, showing the price list", err);
    return new Map();
  }
}

export default async function ProductsPage() {
  const live = await liveData();
  const products = DHI_PRODUCTS.filter((p) => live.get(p.slug)?.status !== "draft");

  return (
    <div lang="fr">
      <section className="section section--tight">
        <div className="shell">
          <p className={styles.eyebrow}>Divine Health International</p>
          <h1 className={styles.title}>Nos produits</h1>
          <p className="lede">
            {products.length} produits pour la santé et le bien-être au quotidien. Chaque produit
            rapporte des PV : 1 PV = {formatFcfa(500)}.
          </p>
          <nav className={styles.toc} aria-label="Catégories">
            {DHI_CATEGORIES.map(([slug, name]) => (
              <a key={slug} href={`#${slug}`} className={styles.tocLink}>
                {name} · {products.filter((p) => p.category === slug).length}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {DHI_CATEGORIES.map(([slug, name]) => {
        const list = products.filter((p) => p.category === slug);
        if (list.length === 0) return null;
        return (
          <section key={slug} id={slug} className="section section--tight" style={{ paddingTop: 0 }}>
            <div className="shell">
              <h2 className={styles.catTitle}>{name}</h2>
              <div className={styles.grid}>
                {list.map((p) => {
                  const info = PRODUCT_INFO[p.slug];
                  const l = live.get(p.slug);
                  return (
                    <article key={p.slug} className={styles.card} id={p.slug}>
                      <div className={styles.media}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l?.image ?? productImagePath(p.slug)} alt={p.name} loading="lazy" decoding="async" />
                        <span className={styles.num}>N° {p.n}</span>
                      </div>
                      <div className={styles.body}>
                        <h3 className={styles.name}>{p.name}</h3>
                        {info ? (
                          <>
                            <p className={styles.label}>Rôle</p>
                            <p className={styles.role}>{info.role}</p>
                            <p className={styles.label}>Bienfaits</p>
                            <ul className={styles.benefits}>
                              {info.benefits.map((b) => (
                                <li key={b}>{b}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        <div className={styles.foot}>
                          <div>
                            <strong className={`${styles.price} num`}>{formatFcfa(l?.price ?? p.price)}</strong>
                            <span className={styles.pv}>{formatPv(l?.pv ?? p.pv)}</span>
                          </div>
                          <Link href={`/marketplace/${p.slug}`} className="btn btn--primary">
                            Acheter
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <section className="section section--tight" style={{ background: "var(--paper-deep)" }}>
        <div className="shell">
          <p className={styles.disclaimer}>{PRODUCT_DISCLAIMER}</p>
          <p className="lede" style={{ marginTop: 18 }}>
            Membres DHI : votre remise de 10 % à 25 % selon votre pack s&apos;applique dans la boutique.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/marketplace" className="btn btn--ink">Voir la boutique</Link>
            <Link href="/join" className="btn btn--ghost">Devenir membre</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
