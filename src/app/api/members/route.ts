import { NextResponse } from "next/server";
import { connectToDatabase, dbConfigured } from "@/lib/mongodb";
import { Member, generateMemberCode } from "@/lib/models";
import { PACKAGE_BY_ID, type PackageId } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  fullName?: string;
  phone?: string;
  email?: string;
  city?: string;
  packageId?: string;
  leg?: string;
  sponsorCode?: string;
};

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
      packageId,
      leg: leg as "left" | "right",
      sponsorCode: sponsorCode || undefined,
    },
  };
}

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      {
        error:
          "Registration is not connected to a database yet. Set MONGODB_URI in .env.local and restart.",
      },
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

    if (value.sponsorCode) {
      const sponsor = await Member.findOne({ memberCode: value.sponsorCode }).lean();
      if (!sponsor) {
        return NextResponse.json(
          { errors: { sponsorCode: "No member has that code. Check it with your sponsor." } },
          { status: 422 }
        );
      }
    }

    // Retry on the rare code collision rather than failing the registration.
    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const memberCode = generateMemberCode();
      try {
        created = await Member.create({ ...value, memberCode });
      } catch (err: unknown) {
        const code = (err as { code?: number }).code;
        if (code !== 11000) throw err;
      }
    }

    if (!created) {
      return NextResponse.json(
        { error: "Could not allocate a member code. Try again." },
        { status: 500 }
      );
    }

    const pkg = PACKAGE_BY_ID[value.packageId];
    return NextResponse.json(
      {
        memberCode: created.memberCode,
        fullName: created.fullName,
        packageName: pkg.name,
        leg: created.leg,
        status: created.status,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[members] registration failed", err);
    return NextResponse.json(
      { error: "We could not save your registration. Try again in a moment." },
      { status: 500 }
    );
  }
}

/** Admin listing. Guarded by ADMIN_PASSWORD, sent as ?key= or a Bearer token. */
export async function GET(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const url = new URL(request.url);
  const key =
    url.searchParams.get("key") ?? request.headers.get("authorization")?.replace("Bearer ", "");

  if (!adminPassword || key !== adminPassword) {
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
      .select("-__v")
      .lean();
    return NextResponse.json({ count: members.length, members });
  } catch (err) {
    console.error("[members] listing failed", err);
    return NextResponse.json({ error: "Could not read the member list." }, { status: 500 });
  }
}
