import { NextResponse } from "next/server";
import { intParam, requireMember, route } from "@/lib/api";
import { pvLedger } from "@/lib/services/dashboard";
import { groupPv, personalPv } from "@/lib/services/binary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The member's PV ledger: every entry with its source. */
export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  const [ledger, own, group] = await Promise.all([
    pvLedger(me.memberCode, intParam(url.searchParams.get("page"), 1), intParam(url.searchParams.get("perPage"), 20, 100)),
    personalPv(me.memberCode),
    groupPv(me.memberCode),
  ]);
  return NextResponse.json({ personalPv: own, groupPv: group, ...ledger });
});
