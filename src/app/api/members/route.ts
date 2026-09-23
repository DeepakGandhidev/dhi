import { NextResponse } from "next/server";
import { connectToDatabase, dbConfigured, databaseNameFromUri } from "@/lib/mongodb";
import { Member, type Leg } from "@/lib/models";
import { registerMember } from "@/lib/services/members";
import { BusinessError } from "@/lib/services/tx";
import { allow, clientIp } from "@/lib/services/rateLimit";
import { hashPassword, startSession, sessionSecretStatus, sessionSecretProblem } from "@/lib/auth";
import { isAdmin } from "@/lib/api";
import { PACKAGE_BY_ID, type PackageId } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = Record<string, string | undefined>;

function validate(body: Body) {
  const errors: Record<string, string> = {};

  const fullName = body.fullName?.trim() ?? "";
  if (fullName.length < 2) errors.fullName = "Enter the name as it appears on your ID.";
  if (fullName.length > 120) errors.fullName = "That name is too long.";

  const phone = body.phone?.trim() ?? "";
  if (!/^[+\d][\d\s-]{6,20}$/.test(phone)) {
    errors.phone = "Enter a phone number we can reach you on, digits only.";
  }

  const email = body.email?.trim() ?? "";
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = "That email address is not valid.";
  }

  const password = body.password ?? "";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (password.length > 200) errors.password = "That password is too long.";

  const packageId = body.packageId as PackageId;
  if (!packageId || !PACKAGE_BY_ID[packageId]) errors.packageId = "Choose a package.";

  const leg = body.leg;
  if (leg !== "left" && leg !== "right") errors.leg = "Choose a leg.";

  const sponsorCode = body.sponsorCode?.trim().toUpperCase() ?? "";
  if (sponsorCode && !/^DHI-[A-Z0-9]{4,10}$/.test(sponsorCode)) {
    errors.sponsorCode = "A sponsor code looks like DHI-K4M2PQ.";
  }

  return {
    errors,
    value: {
      fullName,
      phone,
      email: email || undefined,
      city: body.city?.trim() || undefined,
      password,
      packageId,
      sponsorLeg: leg as Leg,
      sponsorCode: sponsorCode || undefined,
    },
  };
}

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Registration is not connected to a database yet. Set MONGODB_URI and restart." },
      { status: 503 }
    );
  }

  // Checked up front. Signing in needs this, and finding out after the member
  // row exists would leave a half-registered person behind.
  if (!databaseNameFromUri()) {
    return NextResponse.json(
      {
        error:
          "Registration is not fully configured yet: MONGODB_URI has no database name, so it would write to the shared 'test' database. Add /dhi before the '?' in the connection string and redeploy. Nobody has been registered.",
      },
      { status: 503 }
    );
  }

  const secretStatus = sessionSecretStatus();
  if (secretStatus !== "ok") {
    return NextResponse.json(
      { error: `Registration is not fully configured yet. ${sessionSecretProblem(secretStatus)} Nobody has been registered.` },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const { errors, value } = validate(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  try {
    await connectToDatabase();

    if (!(await allow(`register:${clientIp(request)}`, 10, 3600))) {
      return NextResponse.json({ error: "Too many registrations from this connection. Try again later." }, { status: 429 });
    }

    const created = await registerMember({
      fullName: value.fullName,
      phone: value.phone,
      email: value.email,
      city: value.city,
      passwordHash: await hashPassword(value.password),
      packageId: value.packageId,
      sponsorLeg: value.sponsorLeg,
      sponsorCode: value.sponsorCode,
    });

    // The member exists now. If the session cookie cannot be issued we still
    // report success and send them to sign in — never claim a saved
    // registration failed.
    let signedIn = true;
    try {
      await startSession(created.memberCode);
    } catch (err) {
      signedIn = false;
      console.error("[members] registered but could not start session", err);
    }

    return NextResponse.json(
      {
        signedIn,
        memberCode: created.memberCode,
        fullName: created.fullName,
        packageName: PACKAGE_BY_ID[value.packageId].name,
        placementParent: created.placementParent,
        position: created.position,
        depth: created.depth,
        spilled: Boolean(value.sponsorCode) && created.placementParent !== value.sponsorCode,
        status: created.status,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof BusinessError) {
      return err.field
        ? NextResponse.json({ errors: { [err.field]: err.message } }, { status: err.status })
        : NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[members] registration failed", err);
    return NextResponse.json(
      { error: "We could not save your registration. Try again in a moment." },
      { status: 500 }
    );
  }
}

/**
 * Admin listing. Accepts the admin session cookie, or ADMIN_PASSWORD as
 * ?key= / a Bearer token for scripts.
 */
export async function GET(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const url = new URL(request.url);
  const key =
    url.searchParams.get("key") ?? request.headers.get("authorization")?.replace("Bearer ", "");

  if (!(await isAdmin()) && (!adminPassword || key !== adminPassword)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "MONGODB_URI is not set." }, { status: 503 });
  }

  try {
    await connectToDatabase();
    const members = await Member.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .select("-__v -passwordHash")
      .lean();
    return NextResponse.json({ count: members.length, members });
  } catch (err) {
    console.error("[members] listing failed", err);
    return NextResponse.json({ error: "Could not read the member list." }, { status: 500 });
  }
}
