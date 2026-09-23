import { NextResponse } from "next/server";
import { intParam, requireMember, route } from "@/lib/api";
import { BonusEntry } from "@/lib/models";
import { affiliateStats } from "@/lib/services/affiliate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The member's affiliate performance and commission history. */
export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  const page = intParam(url.searchParams.get("page"), 1);
  const filter = { member: me.memberCode, type: "AFFILIATE_COMMISSION" };
  const [stats, items, total] = await Promise.all([
    affiliateStats(me.memberCode),
    BonusEntry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).select("-history").lean(),
    BonusEntry.countDocuments(filter),
  ]);
  return NextResponse.json({ code: me.memberCode, stats, commissions: { items, total, page } });
});
