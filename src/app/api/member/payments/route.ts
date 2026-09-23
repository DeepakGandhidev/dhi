import { NextResponse } from "next/server";
import { body, intParam, rateLimit, requireMember, route } from "@/lib/api";
import { BONUS_TYPES, Payout, type BonusType } from "@/lib/models";
import { paymentHistory } from "@/lib/services/dashboard";
import { withTx } from "@/lib/services/tx";
import { earningsByType, getWallet, requestPayout } from "@/lib/services/wallet";
import { getRules } from "@/lib/services/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Wallet, earnings by type and the combined history (?type=&status=&page=). */
export const GET = route(async (request) => {
  const me = await requireMember();
  const url = new URL(request.url);
  const t = url.searchParams.get("type");
  const type = t === "PAYOUT" || (t && (BONUS_TYPES as readonly string[]).includes(t)) ? (t as BonusType | "PAYOUT") : undefined;
  const [wallet, earnings, history, openPayouts, rules] = await Promise.all([
    getWallet(me.memberCode),
    earningsByType(me.memberCode),
    paymentHistory(me.memberCode, {
      page: intParam(url.searchParams.get("page"), 1),
      perPage: intParam(url.searchParams.get("perPage"), 20, 100),
      type,
      status: url.searchParams.get("status") ?? undefined,
    }),
    Payout.find({ member: me.memberCode, status: { $in: ["pending", "processing"] } }).sort({ createdAt: -1 }).lean(),
    getRules(),
  ]);
  return NextResponse.json({ wallet, earnings, history, openPayouts, minPayout: rules.minPayout });
});

/** Request a withdrawal. The amount is held immediately; the office pays it. */
export const POST = route(async (request) => {
  const me = await requireMember();
  if (me.status !== "active") {
    return NextResponse.json({ error: "Votre pack doit être activé avant un retrait." }, { status: 403 });
  }
  await rateLimit(request, `payout:${me.memberCode}`, 5, 3600);
  const b = await body<{ amount?: unknown; method?: unknown; destination?: unknown }>(request);
  const method = b.method === "bank" || b.method === "cash" ? b.method : "mobile_money";
  const payout = await withTx((s) =>
    requestPayout(me.memberCode, { amount: Number(b.amount), method, destination: String(b.destination ?? "") }, s)
  );
  return NextResponse.json({ payout }, { status: 201 });
});
