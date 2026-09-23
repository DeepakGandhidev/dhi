import { NextResponse } from "next/server";
import { HttpError, intParam, requireMember, route } from "@/lib/api";
import { getGenerationStats, getNodeChildren, listGeneration, networkSummary } from "@/lib/services/network";
import { getBinaryState } from "@/lib/services/binary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET                       summary, generations and binary legs
 * GET ?node=DHI-X           that node's two children (lazy tree expansion)
 * GET ?generation=4&page=2  one generation, paginated (&leg=left&status=active)
 * Members only ever see their own downline.
 */
export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  const node = url.searchParams.get("node");
  const generation = url.searchParams.get("generation");

  if (node) {
    const children = await getNodeChildren(me.memberCode, node.toUpperCase());
    if (!children) throw new HttpError(404, "Ce membre n'est pas dans votre réseau.");
    return NextResponse.json({ node: node.toUpperCase(), children });
  }
  if (generation) {
    const leg = url.searchParams.get("leg");
    const status = url.searchParams.get("status");
    return NextResponse.json(
      await listGeneration(me.memberCode, intParam(generation, 2, 50), {
        page: intParam(url.searchParams.get("page"), 1),
        perPage: intParam(url.searchParams.get("perPage"), 24, 100),
        leg: leg === "left" || leg === "right" ? leg : undefined,
        status: status === "active" || status === "pending" ? status : undefined,
      })
    );
  }
  const [summary, generations, binary] = await Promise.all([
    networkSummary(me.memberCode),
    getGenerationStats(me.memberCode),
    getBinaryState(me.memberCode),
  ]);
  return NextResponse.json({ summary, generations, binary });
});
