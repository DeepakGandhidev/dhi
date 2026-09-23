"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/i18n/fr";
import { formatBps, formatFcfa } from "@/lib/format";
import { Icon } from "@/components/portal/Icon";
import { EmptyState, Notice, ui } from "@/components/portal/ui";
import { ProductImage } from "./ProductImage";
import s from "./marketplace.module.css";

export type Cart = {
  lines: { product: string; slug: string; name: string; image: string | null; unitPrice: number; qty: number; stock: number; discount: number; lineTotal: number }[];
  problems: string[];
  subtotal: number;
  discount: number;
  discountBps: number;
  total: number;
  count: number;
};

export function CartView() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketplace/cart", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCart)
      .catch(() => setError(t.errors.network));
  }, []);

  async function setQty(product: string, qty: number) {
    setBusy(product);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product, qty }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? t.errors.generic);
      else {
        setCart(data);
        router.refresh();
      }
    } catch {
      setError(t.errors.network);
    } finally {
      setBusy(null);
    }
  }

  if (!cart) {
    return error ? <Notice tone="red">{error}</Notice> : <div className={ui.skeleton} style={{ height: 220 }} aria-busy="true" />;
  }
  if (cart.lines.length === 0) {
    return (
      <section className={ui.card}>
        <EmptyState icon="cart" action={<Link href="/marketplace" className={ui.btn}>{t.nav.marketplace}</Link>}>
          {t.empty.cart}
        </EmptyState>
      </section>
    );
  }

  return (
    <div className={ui.split}>
      <section className={ui.card}>
        {cart.problems.map((p) => (
          <Notice key={p} tone="red">{p}</Notice>
        ))}
        {error ? <Notice tone="red">{error}</Notice> : null}
        {cart.lines.map((l) => (
          <div key={l.product} className={s.cartLine} aria-busy={busy === l.product}>
            <div className={s.cartThumb}>
              <ProductImage src={l.image} alt="" category="" />
            </div>
            <div style={{ minWidth: 0 }}>
              <Link href={`/marketplace/${l.slug}`} className={s.cartName}>{l.name}</Link>
              <div className={s.cartMeta}>
                <span>{formatFcfa(l.unitPrice)}</span>
                <div className={s.stepper}>
                  <button type="button" onClick={() => setQty(l.product, l.qty - 1)} disabled={busy !== null || l.qty <= 1} aria-label="Diminuer">
                    <Icon name="minus" size={14} />
                  </button>
                  <output>{l.qty}</output>
                  <button type="button" onClick={() => setQty(l.product, l.qty + 1)} disabled={busy !== null || l.qty >= Math.min(99, l.stock)} aria-label="Augmenter">
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <button type="button" className={s.remove} onClick={() => setQty(l.product, 0)} disabled={busy !== null}>
                  Retirer
                </button>
              </div>
            </div>
            <strong className="num">{formatFcfa(l.lineTotal)}</strong>
          </div>
        ))}
      </section>

      <aside className={`${ui.card} ${s.summary}`}>
        <div className={s.priceLine}><span>{t.marketplace.subtotal} ({cart.count})</span><span className="num">{formatFcfa(cart.subtotal)}</span></div>
        {cart.discount > 0 ? (
          <div className={s.priceLine}><span>{t.marketplace.discount} ({formatBps(cart.discountBps)})</span><span className={`num ${ui.pos}`}>−{formatFcfa(cart.discount)}</span></div>
        ) : null}
        <div className={s.summaryTotal}><span>{t.marketplace.total}</span><span className="num">{formatFcfa(cart.total)}</span></div>
        <Link
          href="/marketplace/commande"
          className={`${ui.btn} ${ui.btnGold} ${ui.btnBlock}`}
          aria-disabled={cart.problems.length > 0}
          style={cart.problems.length ? { pointerEvents: "none", opacity: 0.5 } : undefined}
        >
          {t.marketplace.checkout}
        </Link>
        <p className={ui.rowMeta} style={{ margin: 0 }}>Les prix sont recalculés par DHI au moment de la commande.</p>
      </aside>
    </div>
  );
}
