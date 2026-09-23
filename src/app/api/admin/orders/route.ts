import { NextResponse } from "next/server";
import { HttpError, body, intParam, requireAdmin, route } from "@/lib/api";
import { ORDER_STATUSES, Order, type OrderStatus } from "@/lib/models";
import { setOrderStatus } from "@/lib/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const page = intParam(url.searchParams.get("page"), 1);
  const perPage = intParam(url.searchParams.get("perPage"), 25, 100);
  const filter: Record<string, unknown> = { kind: "marketplace" };
  const status = url.searchParams.get("status");
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) filter.status = status;
  const q = url.searchParams.get("q")?.trim().toUpperCase();
  if (q) filter.$or = [{ number: q }, { buyer: q }, { "affiliate.member": q }];
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    Order.countDocuments(filter),
  ]);
  return NextResponse.json({ items, total, page, perPage });
});

/** { orderId, status, paymentRef?, note? } */
export const POST = route(async (request) => {
  const by = await requireAdmin();
  const b = await body<{ orderId?: unknown; status?: unknown; paymentRef?: unknown; note?: unknown }>(request);
  const status = String(b.status) as OrderStatus;
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) throw new HttpError(422, "Statut inconnu.");
  const paymentRef = b.paymentRef ? String(b.paymentRef).trim().slice(0, 80) : undefined;
  if (status === "confirmed" && !paymentRef) {
    throw new HttpError(422, "Indiquez la référence du paiement reçu.", { paymentRef: "Référence requise." });
  }
  const order = await setOrderStatus(String(b.orderId), status, by, {
    paymentRef,
    note: b.note ? String(b.note).slice(0, 300) : undefined,
  });
  return NextResponse.json({ order });
});
