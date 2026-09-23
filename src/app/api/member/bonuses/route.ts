import { NextResponse } from "next/server";
import { intParam, requireMember, route } from "@/lib/api";
import { BONUS_TYPES, BonusEntry, type BonusType } from "@/lib/models";
import { earningsByType } from "@/lib/services/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?type=BINARY&page=1&from=2026-09-01&to=2026-09-30 */
export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as BonusType | null;
  const filter: Record<string, unknown> = { member: me.memberCode };
  if (type && (BONUS_TYPES as readonly string[]).includes(type)) filter.type = type;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from || to) {
    filter.createdAt = {
      ...(from && !Number.isNaN(Date.parse(from)) ? { $gte: new Date(from) } : {}),
      ...(to && !Number.isNaN(Date.parse(to)) ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }
  const page = intParam(url.searchParams.get("page"), 1);
  const perPage = intParam(url.searchParams.get("perPage"), 20, 100);
  const [items, total, totals] = await Promise.all([
    BonusEntry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).select("-history").lean(),
    BonusEntry.countDocuments(filter),
    earningsByType(me.memberCode),
  ]);
  return NextResponse.json({ items, total, page, perPage, totals });
});
