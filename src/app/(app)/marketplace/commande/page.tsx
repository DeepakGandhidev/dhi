import type { Metadata } from "next";
import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { guestCartOwner, readAffiliate } from "@/lib/api";
import { Member } from "@/lib/models";
import { getCart } from "@/lib/services/catalog";
import { priceItems } from "@/lib/services/orders";
import { t } from "@/i18n/fr";
import { formatBps, formatFcfa, formatPv } from "@/lib/format";
import { CheckoutForm } from "@/components/marketplace/CheckoutForm";
import { EmptyState, Notice, PageHead, ui } from "@/components/portal/ui";
import s from "@/components/marketplace/marketplace.module.css";

export const metadata: Metadata = { title: "Commande" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const me = await currentMember();
  const owner = me ? `m:${me.memberCode}` : await guestCartOwner();
  const items = owner ? await getCart(owner) : [];
  const priced = await priceItems(items, me);
  const affiliate = await readAffiliate();
  const referrer =
    affiliate && affiliate.member !== me?.memberCode
      ? await Member.findOne({ memberCode: affiliate.member, status: "active" }).select("fullName").lean()
      : null;

  if (priced.lines.length === 0) {
    return (
      <div className={ui.page}>
        <PageHead title="Commande" />
        <section className={ui.card}>
          <EmptyState icon="cart" action={<Link href="/marketplace" className={ui.btn}>{t.nav.marketplace}</Link>}>
            {t.empty.cart}
          </EmptyState>
        </section>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <PageHead title="Commande" sub={me ? `Commande au nom de ${me.fullName} (${me.memberCode})` : "Commande sans compte"} />
      {priced.problems.length ? (
        <Notice tone="red" title="Votre panier doit être corrigé">
          {priced.problems.join(" ")} <Link href="/marketplace/panier">Modifier le panier</Link>
        </Notice>
      ) : null}
      <div className={ui.split}>
        <CheckoutForm guest={!me} />
        <aside className={`${ui.card} ${s.summary}`}>
          <h2 className={ui.sectionTitle} style={{ margin: 0 }}>Récapitulatif</h2>
          {priced.lines.map((l) => (
            <div key={String(l.product)} className={s.priceLine}>
              <span>{l.qty} × {l.name}</span>
              <span className="num">{formatFcfa(l.unitPrice * l.qty)}</span>
            </div>
          ))}
          {priced.discount > 0 ? (
            <div className={s.priceLine}><span>{t.marketplace.discount} ({formatBps(priced.discountBps)})</span><span className={`num ${ui.pos}`}>−{formatFcfa(priced.discount)}</span></div>
          ) : null}
          <div className={s.summaryTotal}><span>{t.marketplace.total}</span><span className="num">{formatFcfa(priced.total)}</span></div>
          {priced.pvTotal > 0 ? <p className={ui.rowMeta} style={{ margin: 0 }}>{formatPv(priced.pvTotal)} crédités à la confirmation du paiement.</p> : null}
          {referrer ? <p className={ui.rowMeta} style={{ margin: 0 }}>Recommandé par {referrer.fullName}.</p> : null}
        </aside>
      </div>
    </div>
  );
}
