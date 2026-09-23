import { NextResponse } from "next/server";
import { HttpError, body, requireAdmin, route } from "@/lib/api";
import { Review } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  await requireAdmin();
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const items = await Review.find({ status }).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ items });
});

/** { id, status: "approved" | "rejected" } */
export const POST = route(async (request) => {
  await requireAdmin();
  const b = await body<{ id?: unknown; status?: unknown }>(request);
  if (b.status !== "approved" && b.status !== "rejected") throw new HttpError(422, "Statut inconnu.");
  const r = await Review.findByIdAndUpdate(String(b.id), { $set: { status: b.status } }, { new: true });
  if (!r) throw new HttpError(404, "Avis introuvable.");
  return NextResponse.json({ review: r });
});
