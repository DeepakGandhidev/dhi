import { NextResponse } from "next/server";
import { HttpError, body, requireAdmin, route } from "@/lib/api";
import { adjust } from "@/lib/services/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** { member, kind: "pv" | "bonus", amount, note } — a new ledger entry, never an edit. */
export const POST = route(async (request) => {
  const by = await requireAdmin();
  const b = await body<Record<string, unknown>>(request);
  if (b.kind !== "pv" && b.kind !== "bonus") throw new HttpError(422, "Type de correction inconnu.");
  const res = await adjust(
    { member: String(b.member ?? "").toUpperCase(), kind: b.kind, amount: Number(b.amount), note: String(b.note ?? "") },
    by
  );
  return NextResponse.json(res, { status: 201 });
});
