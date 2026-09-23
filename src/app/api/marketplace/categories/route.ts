import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { listCategories } from "@/lib/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => NextResponse.json({ items: await listCategories() }));
