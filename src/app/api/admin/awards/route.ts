import { NextResponse } from "next/server";
import { HttpError, body, requireAdmin, route } from "@/lib/api";
import { Member, MemberAward } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  await requireAdmin();
  const s = new URL(request.url).searchParams.get("rewardStatus");
  const filter = s === "to_deliver" || s === "delivered" ? { rewardStatus: s } : {};
  const items = await MemberAward.find(filter).sort({ unlockedAt: -1 }).limit(200).lean();
  const names = await Member.find({ memberCode: { $in: items.map((a) => a.member) } }).select("memberCode fullName phone").lean();
  const byCode = new Map(names.map((n) => [n.memberCode, n]));
  return NextResponse.json({ items: items.map((a) => ({ ...a, memberInfo: byCode.get(a.member) ?? null })) });
});

/** { id } — marks the physical reward as handed over. */
export const POST = route(async (request) => {
  const by = await requireAdmin();
  const b = await body<{ id?: unknown }>(request);
  const a = await MemberAward.findOneAndUpdate(
    { _id: String(b.id), rewardStatus: "to_deliver" },
    { $set: { rewardStatus: "delivered", deliveredAt: new Date(), deliveredBy: by } },
    { new: true }
  );
  if (!a) throw new HttpError(409, "Récompense déjà remise ou introuvable.");
  return NextResponse.json({ award: a });
});
