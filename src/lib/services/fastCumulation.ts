import type { ClientSession } from "mongoose";
import { Member, Milestone, type MemberDoc } from "../models";
import { formatFcfa } from "../plan";
import { downlineFilter } from "./network";
import { notify } from "./notifications";
import { getRules } from "./rules";
import { recordBonus } from "./wallet";

/**
 * Fast Cumulation: a structure milestone, separate from the binary. It is
 * reached once, when the member has the required number of active people
 * (254 by default) within the generation limit. It pays nothing per pair
 * and reads no leg volume.
 */
export async function fastCumulationProgress(memberCode: string, session?: ClientSession) {
  const rules = await getRules(session);
  const member = await Member.findOne({ memberCode })
    .select("memberCode depth status")
    .session(session ?? null)
    .lean<Pick<MemberDoc, "memberCode" | "depth" | "status">>();
  if (!member) return null;
  const active = await Member.countDocuments(
    downlineFilter(member, { levels: rules.binaryDepth, activeOnly: true })
  ).session(session ?? null);
  const reached = await Milestone.findOne({ member: memberCode, kind: "fast_cumulation" })
    .session(session ?? null)
    .lean();
  return {
    active,
    required: rules.fastCumulation.people,
    ratio: Math.min(1, active / rules.fastCumulation.people),
    reachedAt: reached?.reachedAt ?? null,
    amount: rules.fastCumulation.amount,
    memberActive: member.status === "active",
  };
}

/** Records the milestone (once) and pays the configured amount, if any. */
export async function checkFastCumulation(memberCode: string, session: ClientSession) {
  const p = await fastCumulationProgress(memberCode, session);
  if (!p || p.reachedAt || !p.memberActive || p.active < p.required) return null;

  const rules = await getRules(session);
  const [milestone] = await Milestone.create(
    [
      {
        member: memberCode,
        kind: "fast_cumulation",
        evidence: { activeWithinLimit: p.active, required: p.required, rulesVersion: rules.version },
      },
    ],
    { session }
  );

  if (p.amount > 0) {
    await recordBonus(
      {
        member: memberCode,
        type: "FAST_CUMULATION",
        amount: p.amount,
        status: "approved",
        sourceType: "milestone",
        sourceId: String(milestone._id),
        details: { activeWithinLimit: p.active, required: p.required, rulesVersion: rules.version },
        description: `Fast Cumulation : structure complète jusqu'à la ${rules.generationLimit}e génération`,
        key: `fast:${memberCode}`,
      },
      session
    );
  }

  await notify(
    session,
    memberCode,
    "fast_cumulation",
    "Fast Cumulation débloqué",
    p.amount > 0
      ? `Votre structure est complète : ${formatFcfa(p.amount)} crédités.`
      : "Votre structure est complète. Le montant sera confirmé par DHI.",
    "/dashboard/bonus?tab=fast"
  );
  return milestone;
}
