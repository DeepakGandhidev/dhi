import { NextResponse } from "next/server";
import { body, cartOwner, route } from "@/lib/api";
import { currentMember } from "@/lib/auth";
import { getCart, setCartItem } from "@/lib/services/catalog";
import { priceItems } from "@/lib/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function priced() {
  const owner = await cartOwner();
  const [items, me] = await Promise.all([getCart(owner!), currentMember()]);
  const p = await priceItems(items, me);
  return {
    lines: p.lines.map((l) => ({
      product: String(l.product),
      slug: l.slug,
      name: l.name,
      image: l.image,
      unitPrice: l.unitPrice,
      qty: l.qty,
      stock: l.stock,
      discount: l.discount,
      lineTotal: l.lineTotal,
    })),
    problems: p.problems,
    subtotal: p.subtotal,
    discount: p.discount,
    discountBps: p.discountBps,
    total: p.total,
    count: p.lines.reduce((n, l) => n + l.qty, 0),
  };
}

export const GET = route(async () => NextResponse.json(await priced()));

/** { productId, qty } — qty is the new quantity; 0 removes the line. */
export const POST = route(async (request) => {
  const b = await body<{ productId?: unknown; qty?: unknown }>(request);
  const qty = Number(b.qty);
  if (!Number.isFinite(qty)) return NextResponse.json({ error: "Quantité invalide." }, { status: 422 });
  const owner = await cartOwner();
  await setCartItem(owner!, String(b.productId ?? ""), qty);
  return NextResponse.json(await priced());
});
