import { NextResponse } from "next/server";
import { connectToDatabase, dbConfigured } from "@/lib/mongodb";
import { Member } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whether the network has anyone in it yet. The join form uses this to tell
 * the very first member that they do not need a sponsor code — without it,
 * the first person to register has no way to know what to put in that field.
 */
export async function GET() {
  if (!dbConfigured) {
    return NextResponse.json({ hasRoot: true, ready: false });
  }
  try {
    await connectToDatabase();
    const root = await Member.findOne({ placementParent: null }).select("_id").lean();
    return NextResponse.json({ hasRoot: Boolean(root), ready: true });
  } catch {
    // If we cannot tell, assume a sponsor is needed rather than inviting
    // someone to claim the root position by mistake.
    return NextResponse.json({ hasRoot: true, ready: false });
  }
}
