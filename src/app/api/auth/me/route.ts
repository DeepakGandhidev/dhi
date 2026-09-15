import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whether a session cookie is present. Deliberately does not touch the
 * database or return member details — the nav only needs to know which
 * label to show, and this keeps every marketing page static.
 */
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ signedIn: Boolean(jar.get("dhi_session")?.value) });
}
