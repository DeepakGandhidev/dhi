import type { ClientSession } from "mongoose";
import {
  AFFILIATE_BPS,
  AWARDS,
  BINARY_DEPTH,
  FAST_CUMULATION,
  GENERATION_LIMIT,
  PACKAGES,
  PAIR_PV,
  PV_VALUE,
  type AwardId,
  type PackageId,
} from "../plan";
import { toBps, assertBps } from "../money";
import { ConfigChange, PlanConfig } from "../models";
import { BusinessError } from "./tx";

/**
 * The business rules every calculation reads. Defaults come from plan.ts;
 * the admin can override them, and each override is versioned. Every ledger
 * entry records the version it was computed under.
 */
export type PackageRules = {
  id: PackageId;
  name: string;
  pv: number;
  amount: number;
  directBps: number;
  binaryBps: number;
  discountBps: number;
};

export type AwardThresholds = {
  id: AwardId;
  minPackage: PackageId | null;
  networkPeople: number;
  sponsoredWith: { award: AwardId; count: number } | null;
  groupPv: number;
  reward: string[];
};

export type Rules = {
  version: number;
  pvValue: number;
  pairPv: number;
  generationLimit: number;
  /** Levels below a member whose volume reaches their legs. */
  binaryDepth: number;
  packages: Record<PackageId, PackageRules>;
  affiliateBps: number;
  /** How long an affiliate cookie attributes sales. */
  affiliateWindowDays: number;
  /** Repeat clicks by one visitor inside this window are not counted. */
  clickDedupeHours: number;
  fastCumulation: { people: number; amount: number };
  awards: AwardThresholds[];
  /** Smallest withdrawal a member can request. */
  minPayout: number;
};

export function defaultRules(): Rules {
  return {
    version: 0,
    pvValue: PV_VALUE,
    pairPv: PAIR_PV,
    generationLimit: GENERATION_LIMIT,
    binaryDepth: BINARY_DEPTH,
    packages: Object.fromEntries(
      PACKAGES.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          pv: p.pv,
          amount: p.amount,
          directBps: toBps(p.direct),
          binaryBps: toBps(p.binary),
          discountBps: toBps(p.discount),
        },
      ])
    ) as Record<PackageId, PackageRules>,
    affiliateBps: AFFILIATE_BPS,
    affiliateWindowDays: 30,
    clickDedupeHours: 24,
    fastCumulation: { ...FAST_CUMULATION },
    awards: AWARDS.map((a) => ({
      id: a.id,
      minPackage: a.minPackage,
      networkPeople: a.networkPeople,
      sponsoredWith: a.sponsoredWith,
      groupPv: a.groupPv,
      reward: a.reward,
    })),
    minPayout: 5_000,
  };
}

const wholePositive = (n: unknown, what: string) => {
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) {
    throw new BusinessError(`${what} must be a whole number ≥ 0.`);
  }
  return n;
};

/** Merges admin overrides onto the defaults, rejecting anything malformed. */
export function mergeRules(base: Rules, overrides: Record<string, unknown>): Rules {
  const out: Rules = structuredClone(base);
  const o = overrides as Partial<Rules> & {
    packages?: Partial<Record<PackageId, Partial<PackageRules>>>;
    awards?: Partial<AwardThresholds>[];
  };

  if (o.pvValue !== undefined) out.pvValue = wholePositive(o.pvValue, "PV value");
  if (o.pairPv !== undefined) out.pairPv = Math.max(1, wholePositive(o.pairPv, "Pair PV"));
  if (o.generationLimit !== undefined) {
    out.generationLimit = Math.max(2, wholePositive(o.generationLimit, "Generation limit"));
    out.binaryDepth = out.generationLimit - 1;
  }
  if (o.affiliateBps !== undefined) out.affiliateBps = assertBps(o.affiliateBps);
  if (o.affiliateWindowDays !== undefined)
    out.affiliateWindowDays = wholePositive(o.affiliateWindowDays, "Affiliate window");
  if (o.clickDedupeHours !== undefined)
    out.clickDedupeHours = wholePositive(o.clickDedupeHours, "Click window");
  if (o.minPayout !== undefined) out.minPayout = wholePositive(o.minPayout, "Minimum payout");
  if (o.fastCumulation) {
    if (o.fastCumulation.people !== undefined)
      out.fastCumulation.people = wholePositive(o.fastCumulation.people, "Fast Cumulation people");
    if (o.fastCumulation.amount !== undefined)
      out.fastCumulation.amount = wholePositive(o.fastCumulation.amount, "Fast Cumulation amount");
  }
  if (o.packages) {
    for (const [id, p] of Object.entries(o.packages)) {
      const target = out.packages[id as PackageId];
      if (!target || !p) continue;
      if (p.pv !== undefined) target.pv = wholePositive(p.pv, `${id} PV`);
      if (p.amount !== undefined) target.amount = wholePositive(p.amount, `${id} price`);
      if (p.directBps !== undefined) target.directBps = assertBps(p.directBps);
      if (p.binaryBps !== undefined) target.binaryBps = assertBps(p.binaryBps);
      if (p.discountBps !== undefined) target.discountBps = assertBps(p.discountBps);
    }
  }
  if (Array.isArray(o.awards)) {
    for (const a of o.awards) {
      const target = out.awards.find((x) => x.id === a.id);
      if (!target) continue;
      if (a.networkPeople !== undefined)
        target.networkPeople = wholePositive(a.networkPeople, `${a.id} network`);
      if (a.groupPv !== undefined) target.groupPv = wholePositive(a.groupPv, `${a.id} PV`);
      if (a.sponsoredWith?.count !== undefined && target.sponsoredWith)
        target.sponsoredWith.count = wholePositive(a.sponsoredWith.count, `${a.id} sponsored`);
      if (Array.isArray(a.reward)) target.reward = a.reward.map(String).slice(0, 6);
    }
  }
  return out;
}

let cache: { rules: Rules; at: number } | null = null;
const TTL_MS = 30_000;

export async function getRules(session?: ClientSession): Promise<Rules> {
  if (!session && cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  const doc = await PlanConfig.findOne({ key: "current" })
    .session(session ?? null)
    .lean();
  const rules = doc
    ? { ...mergeRules(defaultRules(), doc.data ?? {}), version: doc.version }
    : defaultRules();
  if (!session) cache = { rules, at: Date.now() };
  return rules;
}

export function clearRulesCache() {
  cache = null;
}

/** Saves a new overrides document and an immutable copy of it. */
export async function saveRules(
  overrides: Record<string, unknown>,
  by: string,
  session: ClientSession
): Promise<Rules> {
  const merged = mergeRules(defaultRules(), overrides); // throws on bad input
  const current = await PlanConfig.findOne({ key: "current" }).session(session);
  const version = (current?.version ?? 0) + 1;
  await PlanConfig.updateOne(
    { key: "current" },
    { $set: { version, data: overrides, updatedBy: by } },
    { upsert: true, session }
  );
  await ConfigChange.create([{ version, data: overrides, by }], { session });
  clearRulesCache();
  return { ...merged, version };
}
