import { NextResponse } from "next/server";
import { body, intParam, requireMember, route } from "@/lib/api";
import { listNotifications, markRead } from "@/lib/services/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  return NextResponse.json(
    await listNotifications(me.memberCode, intParam(url.searchParams.get("page"), 1), intParam(url.searchParams.get("perPage"), 20, 50))
  );
});

/** { ids: [...] } or { all: true } */
export const POST = route(async (request) => {
  const me = await requireMember();
  const b = await body<{ ids?: unknown; all?: unknown }>(request);
  const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is string => typeof x === "string" && /^[a-f0-9]{24}$/.test(x)) : [];
  await markRead(me.memberCode, b.all === true ? "all" : ids);
  return NextResponse.json({ ok: true });
});
