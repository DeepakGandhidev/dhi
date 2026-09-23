import { NextResponse } from "next/server";
import { body, rateLimit, requireMember, route } from "@/lib/api";
import { listReviews, reviewSummary, submitReview } from "@/lib/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const slug = new URL(request.url).searchParams.get("product") ?? "";
  const [items, summary] = await Promise.all([listReviews(slug), reviewSummary(slug)]);
  return NextResponse.json({ items, ...summary });
});

/** Members who received the product; reviews wait for moderation. */
export const POST = route(async (request) => {
  const me = await requireMember();
  await rateLimit(request, `review:${me.memberCode}`, 10, 3600);
  const b = await body<{ product?: unknown; rating?: unknown; body?: unknown }>(request);
  await submitReview(me, String(b.product ?? ""), Number(b.rating), String(b.body ?? ""));
  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
});
