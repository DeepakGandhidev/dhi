import { NextResponse } from "next/server";
import { intParam, requireMember, route } from "@/lib/api";
import { Order } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  const page = intParam(url.searchParams.get("page"), 1);
  const perPage = intParam(url.searchParams.get("perPage"), 20, 50);
  const filter = { buyer: me.memberCode };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    Order.countDocuments(filter),
  ]);
  return NextResponse.json({ items, total, page, perPage });
});
