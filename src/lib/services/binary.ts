import type { ClientSession } from "mongoose";
import {
  BinaryVolume,
  Member,
  PvEntry,
  VolumeEntry,
  type MemberDoc,
  type PvEntryDoc,
  type PvType,
} from "../models";
import { applyBps, pvToFcfaExact } from "../money";
import { formatFcfa, type PackageId } from "../plan";
import { notify } from "./notifications";
import { getRules, type Rules } from "./rules";
import { recordBonus } from "./wallet";

/* ---- Pure calculation -------------------------------------------------- */

/**
 * Pairs the two legs. Only whole pairs match; everything else carries
 * forward on its own leg, so unmatched volume is never destroyed.
 *   matchLegs(100, 75, 25) → 3 pairs, 75 PV matched, carry 25 left / 0 right
 */
export function matchLegs(left: number, right: number, pairPv: number) {
  const pairs = Math.floor(Math.min(Math.max(left, 0), Math.max(right, 0)) / pairPv);
  const matchedPv = pairs * pairPv;
  return { pairs, matchedPv, carryLeft: left - matchedPv, carryRight: right - matchedPv };
}

/** Binary bonus on matched volume: PV → FCFA, then the package rate, floored. */
export function binaryBonus(matchedPv: number, pvValue: number, binaryBps: number) {
  return applyBps(pvToFcfaExact(matchedPv, pvValue), binaryBps);
}

/* ---- PV ledger --------------------------------------------------------- */

export type CreditPv = {
  member: string;
  pv: number;
  type: PvType;
  sourceType: PvEntryDoc["sourceType"];
  sourceId: string;
  key: string;
  note?: string;
  createdBy?: string;
};

/**
 * The only way PV enters the system. Writes the PV entry, then sends the
 * volume up the placement tree to every ancestor within the generation
 * limit and runs their matching. Idempotent on `key`.
 */
export async function creditPv(input: CreditPv, session: ClientSession) {
  if (!Number.isSafeInteger(input.pv) || input.pv === 0) return null;
  if (await PvEntry.exists({ key: input.key }).session(session)) return null;

  const [entry] = await PvEntry.create([input], { session });
  await propagateVolume(entry, session);
  return entry;
}

/**
 * Adds a PV entry's volume to the legs of every ancestor up to
 * `binaryDepth` levels above the member. Deeper ancestors get nothing: that
 * is the 8th-generation limit.
 *
 * Negative PV (a refund) takes volume back out of the carry. Volume that was
 * already matched and paid cannot be taken back out of a carry; the shortfall
 * is recorded on the VolumeEntry for the office to review.
 */
export async function propagateVolume(entry: PvEntryDoc, session: ClientSession) {
  const rules = await getRules(session);
  const source = await Member.findOne({ memberCode: entry.member })
    .select("memberCode depth lineage")
    .session(session)
    .lean<Pick<MemberDoc, "memberCode" | "depth" | "lineage">>();
  if (!source) return;

  // Nearest ancestor first; stop at the generation limit.
  const ancestors = [...source.lineage].reverse().slice(0, rules.binaryDepth);

  for (let i = 0; i < ancestors.length; i++) {
    const { m: ancestor, leg } = ancestors[i];
    const generation = i + 2; // their direct placement is generation 2

    await VolumeEntry.create(
      [
        {
          member: ancestor,
          fromMember: source.memberCode,
          leg,
          pv: entry.pv,
          generation,
          pvEntry: String(entry._id),
          key: `${entry._id}:${ancestor}`,
        },
      ],
      { session }
    );

    const carry = leg === "left" ? "carryLeft" : "carryRight";
    const total = leg === "left" ? "totalLeft" : "totalRight";

    if (entry.pv > 0) {
      await BinaryVolume.updateOne(
        { member: ancestor },
        { $inc: { [carry]: entry.pv, [total]: entry.pv } },
        { upsert: true, session }
      );
      await runMatching(ancestor, session, rules);
    } else {
      const bv = await BinaryVolume.findOne({ member: ancestor }).session(session);
      const available = bv?.[carry] ?? 0;
      const removable = Math.min(available, -entry.pv);
      await BinaryVolume.updateOne(
        { member: ancestor },
        { $inc: { [carry]: -removable, [total]: entry.pv } },
        { upsert: true, session }
      );
      if (removable < -entry.pv) {
        await VolumeEntry.updateOne(
          { key: `${entry._id}:${ancestor}` },
          { $set: { unrecovered: -entry.pv - removable } },
          { session }
        );
      }
    }
  }
}

/**
 * Matches whatever is waiting on a member's two legs. Inactive members keep
 * accumulating carry but are not paid until their package is confirmed;
 * activation calls this again.
 */
export async function runMatching(memberCode: string, session: ClientSession, rules?: Rules) {
  rules ??= await getRules(session);
  const member = await Member.findOne({ memberCode })
    .select("memberCode packageId status")
    .session(session)
    .lean<Pick<MemberDoc, "memberCode" | "packageId" | "status">>();
  if (!member || member.status !== "active") return null;

  const bv = await BinaryVolume.findOne({ member: memberCode }).session(session);
  if (!bv) return null;

  const m = matchLegs(bv.carryLeft, bv.carryRight, rules.pairPv);
  if (m.pairs === 0) return null;

  const pkg = rules.packages[member.packageId as PackageId];
  const amount = binaryBonus(m.matchedPv, rules.pvValue, pkg.binaryBps);
  const cumulative = bv.matchedPv + m.matchedPv;

  // Conditional on the carry we read, so a concurrent match cannot pay twice.
  const res = await BinaryVolume.updateOne(
    { member: memberCode, carryLeft: bv.carryLeft, carryRight: bv.carryRight },
    { $inc: { carryLeft: -m.matchedPv, carryRight: -m.matchedPv, matchedPv: m.matchedPv, pairs: m.pairs } },
    { session }
  );
  if (res.modifiedCount !== 1) throw new Error("Binary volume changed during matching; retry");

  const entry = await recordBonus(
    {
      member: memberCode,
      type: "BINARY",
      amount,
      pv: m.matchedPv,
      rateBps: pkg.binaryBps,
      status: "approved",
      sourceType: "binary_match",
      sourceId: `${memberCode}:${cumulative}`,
      details: {
        leftBefore: bv.carryLeft,
        rightBefore: bv.carryRight,
        pairs: m.pairs,
        pairPv: rules.pairPv,
        matchedPv: m.matchedPv,
        carryLeftAfter: m.carryLeft,
        carryRightAfter: m.carryRight,
        pvValue: rules.pvValue,
        package: member.packageId,
        rulesVersion: rules.version,
      },
      description: `${m.pairs} paire${m.pairs > 1 ? "s" : ""} · ${m.matchedPv} PV appariés à ${pkg.binaryBps / 100} % (${pkg.name})`,
      key: `binary:${memberCode}:${cumulative}`,
    },
    session
  );

  if (entry) {
    await notify(
      session,
      memberCode,
      "binary_pair",
      `${m.pairs} nouvelle${m.pairs > 1 ? "s" : ""} paire${m.pairs > 1 ? "s" : ""} binaire${m.pairs > 1 ? "s" : ""}`,
      `${m.matchedPv} PV appariés : ${formatFcfa(amount)} crédités.`,
      "/dashboard/bonus?tab=binary"
    );
  }
  return entry;
}

export async function getBinaryState(memberCode: string) {
  const bv = await BinaryVolume.findOne({ member: memberCode }).lean();
  return {
    carryLeft: bv?.carryLeft ?? 0,
    carryRight: bv?.carryRight ?? 0,
    totalLeft: bv?.totalLeft ?? 0,
    totalRight: bv?.totalRight ?? 0,
    matchedPv: bv?.matchedPv ?? 0,
    pairs: bv?.pairs ?? 0,
  };
}

export async function personalPv(memberCode: string, session?: ClientSession) {
  const [row] = await PvEntry.aggregate([
    { $match: { member: memberCode } },
    { $group: { _id: null, pv: { $sum: "$pv" } } },
  ]).session(session ?? null);
  return (row?.pv as number) ?? 0;
}

/** Own PV plus every PV that reached this member's legs (already generation-limited). */
export async function groupPv(memberCode: string, session?: ClientSession) {
  const own = await personalPv(memberCode, session);
  const [row] = await VolumeEntry.aggregate([
    { $match: { member: memberCode } },
    { $group: { _id: null, pv: { $sum: "$pv" } } },
  ]).session(session ?? null);
  return own + ((row?.pv as number) ?? 0);
}
