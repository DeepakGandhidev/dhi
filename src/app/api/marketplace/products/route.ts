import { NextResponse } from "next/server";
import { intParam, route } from "@/lib/api";
import { currentMember } from "@/lib/auth";
import { listProducts, reviewSummaries } from "@/lib/services/catalog";
import { productPriceFor } from "@/lib/services/orders";
import { getRules } from "@/lib/services/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?q=&category=&sort=new|price_asc|price_desc&page= — prices are the caller's own. */
export const GET = route(async (request) => {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort");
  const [list, me, rules] = await Promise.all([
    listProducts({
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      sort: sort === "price_asc" || sort === "price_desc" ? sort : "new",
      page: intParam(url.searchParams.get("page"), 1),
      perPage: intParam(url.searchParams.get("perPage"), 12, 48),
    }),
    currentMember(),
    getRules(),
  ]);
  const reviews = await reviewSummaries(list.items.map((p) => p.slug));
  return NextResponse.json({
    ...list,
    items: list.items.map((p) => ({
      id: String(p._id),
      slug: p.slug,
      name: p.name,
      category: p.category,
      summary: p.summary,
      image: p.images[0] ?? null,
      stock: p.stock,
      ...productPriceFor(p.price, me, rules),
      affiliateBps: p.affiliateBps ?? rules.affiliateBps,
      rating: reviews.get(p.slug) ?? { average: 0, count: 0 },
    })),
  });
});
