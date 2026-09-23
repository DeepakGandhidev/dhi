import { NextResponse } from "next/server";
import { HttpError, body, intParam, requireAdmin, route } from "@/lib/api";
import { Member, Order } from "@/lib/models";
import { activateMember, suspendMember } from "@/lib/services/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?q=name|code|phone&status=pending|active|suspended&page= */
export const GET = route(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const page = intParam(url.searchParams.get("page"), 1);
  const perPage = intParam(url.searchParams.get("perPage"), 25, 100);
  const filter: Record<string, unknown> = {};
  const status = url.searchParams.get("status");
  if (status === "pending" || status === "active" || status === "suspended") filter.status = status;
  const q = url.searchParams.get("q")?.trim().slice(0, 60);
  if (q) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    filter.$or = [{ fullName: rx }, { memberCode: rx }, { phone: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    Member.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).select("-passwordHash -lineage").lean(),
    Member.countDocuments(filter),
  ]);
  const orders = await Order.find({ kind: "package", buyer: { $in: items.map((m) => m.memberCode) } })
    .select("buyer number total paymentStatus")
    .lean();
  const byBuyer = new Map(orders.map((o) => [o.buyer, o]));
  return NextResponse.json({
    items: items.map((m) => ({ ...m, packageOrder: byBuyer.get(m.memberCode) ?? null })),
    total,
    page,
    perPage,
  });
});

/** { memberCode, action: "activate" | "suspend" | "unsuspend", paymentRef? } */
export const POST = route(async (request) => {
  const by = await requireAdmin();
  const b = await body<{ memberCode?: unknown; action?: unknown; paymentRef?: unknown }>(request);
  const code = String(b.memberCode ?? "").toUpperCase();
  if (b.action === "activate") {
    const ref = String(b.paymentRef ?? "").trim().slice(0, 80);
    if (ref.length < 3) throw new HttpError(422, "Indiquez la référence du paiement reçu.", { paymentRef: "Référence requise." });
    await activateMember(code, by, ref);
  } else if (b.action === "suspend" || b.action === "unsuspend") {
    await suspendMember(code, b.action === "suspend");
  } else {
    throw new HttpError(422, "Action inconnue.");
  }
  return NextResponse.json({ ok: true });
});
