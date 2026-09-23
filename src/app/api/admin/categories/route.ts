import { NextResponse } from "next/server";
import { body, requireAdmin, route } from "@/lib/api";
import { saveCategory } from "@/lib/services/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  await requireAdmin();
  const category = await saveCategory(await body(request));
  return NextResponse.json({ category }, { status: 201 });
});
