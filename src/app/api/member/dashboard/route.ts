import { NextResponse } from "next/server";
import { requireMember, route } from "@/lib/api";
import { getDashboard } from "@/lib/services/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the home screen needs, in one request. */
export const GET = route(async () => {
  const me = await requireMember();
  return NextResponse.json(await getDashboard(me.memberCode));
});
