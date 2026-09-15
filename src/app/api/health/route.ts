import { NextResponse } from "next/server";
import { connectToDatabase, dbConfigured } from "@/lib/mongodb";
import { Member } from "@/lib/models";
import { sessionSecretStatus, MIN_SECRET_LENGTH } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment self-check, so a misconfigured environment can be diagnosed
 * without reading server logs. Gated by ADMIN_PASSWORD, and it reports only
 * whether values are present and usable — never the values themselves.
 */
export async function GET(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const key = new URL(request.url).searchParams.get("key");
  if (!adminPassword || key !== adminPassword) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const secret = sessionSecretStatus();
  const report: Record<string, unknown> = {
    MONGODB_URI: dbConfigured ? "set" : "missing",
    ADMIN_PASSWORD: "set",
    SESSION_SECRET: secret,
    sessionSecretLength: (process.env.SESSION_SECRET ?? "").trim().length,
    minimumSecretLength: MIN_SECRET_LENGTH,
    database: "not checked",
    members: null,
    canRegister: false,
  };

  if (dbConfigured) {
    try {
      await connectToDatabase();
      const count = await Member.countDocuments();
      report.database = "connected";
      report.members = count;
      report.nextRegistrationIsRoot = count === 0;
    } catch (err) {
      report.database = "failed";
      report.databaseError =
        err instanceof Error ? err.message.slice(0, 200) : "unknown error";
    }
  }

  report.canRegister = secret === "ok" && report.database === "connected";
  return NextResponse.json(report);
}
