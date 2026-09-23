import { NextResponse } from "next/server";
import { body, requireAdmin, route } from "@/lib/api";
import { ConfigChange, PlanConfig } from "@/lib/models";
import { defaultRules, getRules, saveRules } from "@/lib/services/rules";
import { withTx } from "@/lib/services/tx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Effective rules, the stored overrides, the defaults, and the change log. */
export const GET = route(async () => {
  await requireAdmin();
  const [rules, current, history] = await Promise.all([
    getRules(),
    PlanConfig.findOne({ key: "current" }).lean(),
    ConfigChange.find().sort({ version: -1 }).limit(20).lean(),
  ]);
  return NextResponse.json({ rules, overrides: current?.data ?? {}, defaults: defaultRules(), history });
});

/** { overrides } — replaces the stored overrides; validated before saving. */
export const PUT = route(async (request) => {
  const by = await requireAdmin();
  const b = await body<{ overrides?: Record<string, unknown> }>(request);
  const rules = await withTx((s) => saveRules(b.overrides ?? {}, by, s));
  return NextResponse.json({ rules });
});
