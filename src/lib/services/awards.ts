import type { ClientSession } from "mongoose";
import { Member, MemberAward, type MemberDoc } from "../models";
import { AWARD_BY_ID, PACKAGE_RANK, type AwardId, type PackageId } from "../plan";
import { groupPv } from "./binary";
import { downlineFilter } from "./network";
import { notify } from "./notifications";
import { getRules, type AwardThresholds, type Rules } from "./rules";

/**
 * The awards engine. Each award is a set of independent requirements; each
 * one is reported with its own current/required figures, and nothing is
 * averaged. An award unlocks when every requirement is met, and once
 * unlocked it is recorded and never re-evaluated away.
 */

export type Requirement =
  | { kind: "package"; met: boolean; current: PackageId; required: PackageId }
  | { kind: "network"; met: boolean; current: number; required: number; ratio: number }
  | {
      kind: "sponsored";
      met: boolean;
      award: AwardId;
      current: number;
      required: number;
      ratio: number;
    }
  | { kind: "pv"; met: boolean; current: number; required: number; ratio: number };

export type AwardStatus = "unlocked" | "eligible" | "in_progress" | "locked";

export type AwardResult = {
  award: AwardId;
  eligible: boolean;
  status: AwardStatus;
  unlockedAt: Date | null;
  requirements: Requirement[];
  missingRequirements: string[];
  reward: string[];
};

export type AwardInputs = {
  packageId: PackageId;
  /** Only members with a confirmed package can unlock an award. */
  active: boolean;
  activeNetwork: number;
  groupPv: number;
  /** For each award, how many personally sponsored members hold it. */
  sponsoredWithAward: Partial<Record<AwardId, number>>;
  unlocked: Partial<Record<AwardId, Date>>;
};

const ratio = (current: number, required: number) =>
  required <= 0 ? 1 : Math.min(1, Math.max(0, current / required));

const fr = (n: number) => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");

/** Pure: evaluates one award against a member's figures. */
export function evaluateAward(t: AwardThresholds, input: AwardInputs): AwardResult {
  const requirements: Requirement[] = [];
  const missing: string[] = [];

  if (t.minPackage) {
    const met = PACKAGE_RANK[input.packageId] >= PACKAGE_RANK[t.minPackage];
    requirements.push({ kind: "package", met, current: input.packageId, required: t.minPackage });
    if (!met) missing.push(`Détenir le pack ${t.minPackage[0].toUpperCase()}${t.minPackage.slice(1)} ou supérieur`);
  }
  if (t.networkPeople > 0) {
    const met = input.activeNetwork >= t.networkPeople;
    requirements.push({
      kind: "network",
      met,
      current: input.activeNetwork,
      required: t.networkPeople,
      ratio: ratio(input.activeNetwork, t.networkPeople),
    });
    if (!met)
      missing.push(`${fr(t.networkPeople - input.activeNetwork)} personnes actives de plus dans votre réseau`);
  }
  if (t.sponsoredWith) {
    const current = input.sponsoredWithAward[t.sponsoredWith.award] ?? 0;
    const met = current >= t.sponsoredWith.count;
    requirements.push({
      kind: "sponsored",
      met,
      award: t.sponsoredWith.award,
      current,
      required: t.sponsoredWith.count,
      ratio: ratio(current, t.sponsoredWith.count),
    });
    if (!met) {
      const left = t.sponsoredWith.count - current;
      missing.push(
        `Parrainer personnellement ${left} membre${left > 1 ? "s" : ""} ${AWARD_BY_ID[t.sponsoredWith.award].nameFr}`
      );
    }
  }
  if (t.groupPv > 0) {
    const met = input.groupPv >= t.groupPv;
    requirements.push({
      kind: "pv",
      met,
      current: input.groupPv,
      required: t.groupPv,
      ratio: ratio(input.groupPv, t.groupPv),
    });
    if (!met) missing.push(`Cumuler ${fr(t.groupPv - input.groupPv)} PV supplémentaires`);
  }

  const eligible = requirements.every((r) => r.met);
  const unlockedAt = input.unlocked[t.id] ?? null;
  const packageBlocked = requirements.some((r) => r.kind === "package" && !r.met);
  const anyProgress = requirements.some((r) =>
    r.kind === "package" ? r.met : r.current > 0
  );
  const status: AwardStatus = unlockedAt
    ? "unlocked"
    : eligible
      ? "eligible"
      : packageBlocked
        ? "locked"
        : anyProgress
          ? "in_progress"
          : "locked";

  return {
    award: t.id,
    eligible,
    status,
    unlockedAt,
    requirements,
    missingRequirements: unlockedAt ? [] : missing,
    reward: t.reward,
  };
}

/** Gathers a member's figures from the database. */
export async function loadAwardInputs(
  memberCode: string,
  session?: ClientSession,
  rules?: Rules
): Promise<AwardInputs | null> {
  rules ??= await getRules(session);
  const member = await Member.findOne({ memberCode })
    .select("memberCode depth packageId status")
    .session(session ?? null)
    .lean<Pick<MemberDoc, "memberCode" | "depth" | "packageId" | "status">>();
  if (!member) return null;

  const activeNetwork = await Member.countDocuments(
    downlineFilter(member, { levels: rules.binaryDepth, activeOnly: true })
  ).session(session ?? null);
  const pv = await groupPv(memberCode, session);

  const sponsoredCodes = (
    await Member.find({ sponsorCode: memberCode, status: "active" })
      .select("memberCode")
      .session(session ?? null)
      .lean<{ memberCode: string }[]>()
  ).map((m) => m.memberCode);

  const sponsoredAwards = sponsoredCodes.length
    ? await MemberAward.aggregate([
        { $match: { member: { $in: sponsoredCodes } } },
        { $group: { _id: "$award", n: { $sum: 1 } } },
      ]).session(session ?? null)
    : [];
  const own = await MemberAward.find({ member: memberCode })
    .session(session ?? null)
    .lean();

  return {
    packageId: member.packageId as PackageId,
    active: member.status === "active",
    activeNetwork,
    groupPv: pv,
    sponsoredWithAward: Object.fromEntries(sponsoredAwards.map((a) => [a._id, a.n])),
    unlocked: Object.fromEntries(own.map((a) => [a.award, a.unlockedAt])),
  };
}

export async function calculateMemberAwards(memberCode: string, session?: ClientSession) {
  const rules = await getRules(session);
  const input = await loadAwardInputs(memberCode, session, rules);
  if (!input) return null;
  return {
    inputs: input,
    awards: rules.awards.map((t) => evaluateAward(t, input)),
  };
}

/** The member's grade: their highest unlocked award, or null. */
export function gradeOf(awards: AwardResult[]): AwardId | null {
  return [...awards].reverse().find((a) => a.status === "unlocked")?.award ?? null;
}

/**
 * Unlocks every award the member now qualifies for. An unlock can qualify
 * their sponsor for the next award up, so the sponsor is evaluated next.
 */
export async function evaluateAndUnlock(
  memberCode: string,
  session: ClientSession,
  hops = 0
): Promise<AwardId[]> {
  const result = await calculateMemberAwards(memberCode, session);
  if (!result || !result.inputs.active) return [];
  const unlocked: AwardId[] = [];

  for (const a of result.awards) {
    if (a.status !== "eligible") continue;
    const existing = await MemberAward.findOne({ member: memberCode, award: a.award }).session(session);
    if (existing) continue;
    await MemberAward.create(
      [
        {
          member: memberCode,
          award: a.award,
          evidence: { ...result.inputs, requirements: a.requirements },
        },
      ],
      { session }
    );
    unlocked.push(a.award);
    await notify(
      session,
      memberCode,
      "award_unlocked",
      `Award ${AWARD_BY_ID[a.award].nameFr} débloqué !`,
      `Récompense : ${a.reward.join(", ")}. L'équipe DHI vous contactera pour la remise.`,
      "/dashboard/awards"
    );
  }

  if (unlocked.length > 0 && hops < 12) {
    const me = await Member.findOne({ memberCode })
      .select("sponsorCode")
      .session(session)
      .lean<{ sponsorCode?: string | null }>();
    if (me?.sponsorCode) await evaluateAndUnlock(me.sponsorCode, session, hops + 1);
  }
  return unlocked;
}
