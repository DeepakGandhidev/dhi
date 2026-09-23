import type { Metadata } from "next";
import { PageHead, ui } from "@/components/portal/ui";
import { CartView } from "@/components/marketplace/CartView";
import { t } from "@/i18n/fr";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return (
    <div className={ui.page}>
      <PageHead title={t.nav.cart} />
      <CartView />
    </div>
  );
}
