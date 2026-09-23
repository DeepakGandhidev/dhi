import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { body, endAdminSession, isAdmin, rateLimit, route, startAdminSession } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => NextResponse.json({ admin: await isAdmin() }));

export const POST = route(async (request) => {
  await rateLimit(request, "admin-login", 8, 900);
  const { password } = await body<{ password?: unknown }>(request);
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const given = Buffer.from(String(password ?? ""));
  const want = Buffer.from(expected);
  const ok = expected.length > 0 && given.length === want.length && timingSafeEqual(given, want);
  if (!ok) return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  await startAdminSession();
  return NextResponse.json({ admin: true });
});

export const DELETE = route(async () => {
  await endAdminSession();
  return NextResponse.json({ admin: false });
});
