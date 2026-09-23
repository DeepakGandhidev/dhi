import { NextResponse } from "next/server";
import { requireMember, route } from "@/lib/api";
import { calculateMemberAwards, gradeOf } from "@/lib/services/awards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const me = await requireMember();
  const result = await calculateMemberAwards(me.memberCode);
  return NextResponse.json({ grade: result ? gradeOf(result.awards) : null, ...result });
});
