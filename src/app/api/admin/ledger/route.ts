import { NextResponse } from "next/server";
import { HttpError, requireAdmin, route } from "@/lib/api";
import { inspectMember } from "@/lib/services/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?member=DHI-X — every PV, volume, bonus and payout record behind a member's figures. */
export const GET = route(async (request) => {
  await requireAdmin();
  const code = new URL(request.url).searchParams.get("member")?.toUpperCase() ?? "";
  const data = await inspectMember(code);
  if (!data) throw new HttpError(404, "Membre introuvable.");
  return NextResponse.json(data);
});
