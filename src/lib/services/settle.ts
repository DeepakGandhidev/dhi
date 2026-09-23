import type { ClientSession } from "mongoose";
import type { MemberDoc } from "../models";
import { evaluateAndUnlock } from "./awards";
import { checkFastCumulation } from "./fastCumulation";
import { getRules } from "./rules";

/**
 * After anything that changes who is active or how much PV sits where:
 * re-check Fast Cumulation and awards for the member and every ancestor
 * whose figures could have moved.
 */
export async function settleUpline(
  member: Pick<MemberDoc, "memberCode" | "lineage" | "sponsorCode">,
  session: ClientSession
) {
  const rules = await getRules(session);
  const chain = [member.memberCode, ...[...member.lineage].reverse().slice(0, rules.binaryDepth).map((s) => s.m)];
  for (const code of chain) {
    await checkFastCumulation(code, session);
    await evaluateAndUnlock(code, session);
  }
  if (member.sponsorCode && !chain.includes(member.sponsorCode)) {
    await evaluateAndUnlock(member.sponsorCode, session);
  }
}
