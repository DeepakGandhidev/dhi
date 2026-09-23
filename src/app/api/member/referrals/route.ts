import { NextResponse } from "next/server";
import { intParam, requireMember, route } from "@/lib/api";
import { Member } from "@/lib/models";
import { personalPvFor } from "@/lib/services/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The member's referral link and the people they personally sponsored. */
export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  const page = intParam(url.searchParams.get("page"), 1);
  const perPage = intParam(url.searchParams.get("perPage"), 20, 100);
  const filter = { sponsorCode: me.memberCode };
  const [rows, total, active] = await Promise.all([
    Member.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .select("memberCode fullName packageId status position placementParent createdAt activatedAt")
      .lean(),
    Member.countDocuments(filter),
    Member.countDocuments({ ...filter, status: "active" }),
  ]);
  const pv = await personalPvFor(rows.map((r) => r.memberCode));
  return NextResponse.json({
    code: me.memberCode,
    link: `${url.origin}/join?ref=${me.memberCode}`,
    total,
    active,
    items: rows.map((r) => ({ ...r, personalPv: pv.get(r.memberCode) ?? 0 })),
    page,
    perPage,
  });
});
