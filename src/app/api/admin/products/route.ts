import { NextResponse } from "next/server";
import { body, intParam, requireAdmin, route } from "@/lib/api";
import { Product } from "@/lib/models";
import { saveProduct } from "@/lib/services/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All products including drafts. */
export const GET = route(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const page = intParam(url.searchParams.get("page"), 1);
  const [items, total] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean(),
    Product.countDocuments(),
  ]);
  return NextResponse.json({ items, total, page, perPage: 50 });
});

/** Create, or update when `id` is given. */
export const POST = route(async (request) => {
  await requireAdmin();
  const b = await body<Record<string, unknown>>(request);
  const product = await saveProduct(b, b.id ? String(b.id) : undefined);
  return NextResponse.json({ product }, { status: b.id ? 200 : 201 });
});
