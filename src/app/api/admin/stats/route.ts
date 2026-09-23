import { NextResponse } from "next/server";
import { requireAdmin, route } from "@/lib/api";
import { adminStats } from "@/lib/services/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return NextResponse.json(await adminStats());
});
