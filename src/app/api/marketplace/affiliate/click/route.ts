import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { AFFILIATE_COOKIE, VISITOR_COOKIE, body, rateLimit, route } from "@/lib/api";
import { signValue } from "@/lib/auth";
import { clientIp } from "@/lib/services/rateLimit";
import { recordClick } from "@/lib/services/affiliate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the product page when it was opened with ?ref=. Validates the
 * referral, records the click (deduplicated per visitor), and sets a signed
 * attribution cookie the checkout trusts. An invalid ref sets nothing.
 */
export const POST = route(async (request) => {
  await rateLimit(request, "aff-click", 60, 600);
  const b = await body<{ ref?: unknown; slug?: unknown }>(request);
  const jar = await cookies();
  let visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor || visitor.length < 16) {
    visitor = randomBytes(16).toString("base64url");
    jar.set(VISITOR_COOKIE, visitor, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const result = await recordClick({
    ref: String(b.ref ?? ""),
    slug: String(b.slug ?? ""),
    visitorId: visitor,
    ip: clientIp(request),
  });
  if (!result) return NextResponse.json({ tracked: false });

  const ttl = result.windowDays * 86400;
  jar.set(
    AFFILIATE_COOKIE,
    signValue("affiliate", { member: result.click.affiliate, click: String(result.click._id) }, ttl),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: ttl }
  );
  return NextResponse.json({ tracked: true, counted: result.counted });
});
