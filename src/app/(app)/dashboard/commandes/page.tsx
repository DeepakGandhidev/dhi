import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { Order } from "@/lib/models";
import { t } from "@/i18n/fr";
import { formatDate, formatFcfa, formatPv } from "@/lib/format";
import { EmptyState, PageHead, Pager, StatusPill, ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Mes commandes" };
export const dynamic = "force-dynamic";

const PAYMENT: Record<string, string> = {
  mobile_money: "Mobile Money",
  cash_on_delivery: "Paiement à la livraison",
  bank_transfer: "Virement",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await currentMember();
  if (!me) redirect("/login");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const filter = { buyer: me.memberCode };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 10).limit(10).lean(),
    Order.countDocuments(filter),
  ]);

  return (
    <div className={ui.page}>
      <PageHead
        title={t.nav.orders}
        action={
          <Link href="/marketplace" className={ui.btn}>
            {t.nav.marketplace}
          </Link>
        }
      />
      {orders.length === 0 ? (
        <section className={ui.card}>
          <EmptyState icon="receipt">{t.empty.orders}</EmptyState>
        </section>
      ) : (
        orders.map((o) => (
          <section key={String(o._id)} className={ui.card}>
            <h2 className={ui.sectionTitle}>
              <span>
                {o.number} {o.kind === "package" ? "· Pack" : ""}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <StatusPill status={o.status} />
                <StatusPill status={o.paymentStatus} label={o.paymentStatus === "pending" ? "Paiement en attente" : undefined} />
              </span>
            </h2>
            <div className={ui.list}>
              {o.items.map((l) => (
                <div key={l.slug} className={ui.row}>
                  <div>
                    <div className={ui.rowTitle}>
                      {l.product ? <Link href={`/marketplace/${l.slug}`}>{l.name}</Link> : l.name}
                    </div>
                    <div className={ui.rowMeta}>
                      <span>
                        {l.qty} × {formatFcfa(l.unitPrice)}
                      </span>
                      {l.discount ? <span>Remise −{formatFcfa(l.discount)}</span> : null}
                      {l.pv ? <span>{formatPv(l.pv)}</span> : null}
                    </div>
                  </div>
                  <div className={ui.rowAmount}>{formatFcfa(l.lineTotal)}</div>
                </div>
              ))}
            </div>
            <dl className={ui.kv} style={{ marginTop: 14 }}>
              <dt>Date</dt>
              <dd>{formatDate(o.createdAt)}</dd>
              <dt>Paiement</dt>
              <dd>
                {PAYMENT[o.paymentMethod]}
                {o.paymentRef ? ` · ${o.paymentRef}` : ""}
              </dd>
              {o.shipping ? (
                <>
                  <dt>Livraison</dt>
                  <dd>
                    {o.shipping.address}, {o.shipping.city}
                  </dd>
                </>
              ) : null}
              <dt>Total</dt>
              <dd>{formatFcfa(o.total)}</dd>
            </dl>
          </section>
        ))
      )}
      <Pager page={page} total={total} perPage={10} href={(p) => `/dashboard/commandes?page=${p}`} />
    </div>
  );
}
