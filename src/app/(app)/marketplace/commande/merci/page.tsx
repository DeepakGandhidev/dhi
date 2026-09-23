import type { Metadata } from "next";
import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { Order } from "@/lib/models";
import { formatFcfa } from "@/lib/format";
import { Icon } from "@/components/portal/Icon";
import { ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Commande enregistrée" };
export const dynamic = "force-dynamic";

export default async function ThanksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const n = (await searchParams).n ?? "";
  const me = await currentMember();
  // Members see their own order's details; anyone else just the number.
  const order = me && /^CMD-\d+$/.test(n) ? await Order.findOne({ number: n, buyer: me.memberCode }).lean() : null;
  return (
    <section className={ui.card} style={{ textAlign: "center", display: "grid", gap: 14, justifyItems: "center", padding: "40px 20px" }}>
      <span style={{ display: "grid", placeItems: "center", width: 64, height: 64, borderRadius: "50%", background: "var(--emerald-soft)", color: "var(--emerald)" }}>
        <Icon name="check" size={32} />
      </span>
      <h1 style={{ fontSize: "var(--t-xl)" }}>Commande enregistrée</h1>
      <p className={ui.pageSub} style={{ margin: 0 }}>
        Numéro <strong className="num">{n}</strong>
        {order ? ` · ${formatFcfa(order.total)}` : ""}. DHI vous contacte pour le paiement et la livraison ; la commande est
        confirmée à réception du paiement.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {me ? <Link className={ui.btn} href="/dashboard/commandes">Mes commandes</Link> : null}
        <Link className={`${ui.btn} ${ui.btnGhost}`} href="/marketplace">Continuer mes achats</Link>
      </div>
    </section>
  );
}
