import { NextResponse } from "next/server";
import { connectToDatabase, dbConfigured } from "@/lib/mongodb";
import { Member } from "@/lib/models";
import { verifyPassword, startSession } from "@/lib/auth";
import { guestCartOwner } from "@/lib/api";
import { mergeCarts } from "@/lib/services/catalog";
import { allow, clientIp } from "@/lib/services/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json({ error: "Sign-in is not connected to a database yet." }, { status: 503 });
  }

  let body: { memberCode?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const memberCode = body.memberCode?.trim().toUpperCase() ?? "";
  const password = body.password ?? "";

  if (!memberCode || !password) {
    return NextResponse.json({ error: "Enter your member code and password." }, { status: 422 });
  }

  try {
    await connectToDatabase();
    if (!(await allow(`login:${clientIp(request)}`, 10, 900))) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Wait a few minutes and try again." },
        { status: 429 }
      );
    }
    const member = await Member.findOne({ memberCode }).select("memberCode passwordHash").lean<{
      memberCode: string;
      passwordHash: string;
    }>();

    // Same message either way, so this cannot be used to discover which
    // member codes exist.
    const ok = member ? await verifyPassword(password, member.passwordHash) : false;
    if (!member || !ok) {
      return NextResponse.json(
        { error: "That member code and password do not match." },
        { status: 401 }
      );
    }

    await startSession(member.memberCode);
    const guest = await guestCartOwner();
    if (guest) await mergeCarts(guest, `m:${member.memberCode}`).catch(() => {});
    return NextResponse.json({ memberCode: member.memberCode });
  } catch (err) {
    console.error("[auth] login failed", err);
    return NextResponse.json({ error: "We could not sign you in. Try again." }, { status: 500 });
  }
}
