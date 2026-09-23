import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** JSON for fetch callers; a redirect to sign-in for a plain form post. */
export async function POST(request: Request) {
  await endSession();
  const wantsHtml = request.headers.get("accept")?.includes("text/html");
  if (wantsHtml) return NextResponse.redirect(new URL("/login", request.url), 303);
  return NextResponse.json({ ok: true });
}
