import { NextResponse } from "next/server";
import { HttpError, body, intParam, requireAdmin, route } from "@/lib/api";
import { PAYOUT_STATUSES, Payout, type PayoutStatus } from "@/lib/models";
import { withTx } from "@/lib/services/tx";
import { setPayoutStatus } from "@/lib/services/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const page = intParam(url.searchParams.get("page"), 1);
  const filter: Record<string, unknown> = {};
  const status = url.searchParams.get("status");
  if (status && (PAYOUT_STATUSES as readonly string[]).includes(status)) filter.status = status;
  const [items, total] = await Promise.all([
    Payout.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).lean(),
    Payout.countDocuments(filter),
  ]);
  return NextResponse.json({ items, total, page, perPage: 25 });
});

/** { id, status, providerRef?, reason? } */
export const POST = route(async (request) => {
  const by = await requireAdmin();
  const b = await body<{ id?: unknown; status?: unknown; providerRef?: unknown; reason?: unknown }>(request);
  const status = String(b.status) as PayoutStatus;
  if (!(PAYOUT_STATUSES as readonly string[]).includes(status)) throw new HttpError(422, "Statut inconnu.");
  if (status === "paid" && !b.providerRef) throw new HttpError(422, "Indiquez la référence de la transaction.", { providerRef: "Référence requise." });
  if (status === "failed" && !b.reason) throw new HttpError(422, "Indiquez la raison de l'échec.", { reason: "Raison requise." });
  const payout = await withTx((s) =>
    setPayoutStatus(String(b.id), status, by, s, {
      providerRef: b.providerRef ? String(b.providerRef).slice(0, 80) : undefined,
      reason: b.reason ? String(b.reason).slice(0, 200) : undefined,
    })
  );
  return NextResponse.json({ payout });
});
