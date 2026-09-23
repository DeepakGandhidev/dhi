import type { ClientSession } from "mongoose";
import { Member, type MemberDoc } from "../models";
import { applyBps, pvToFcfaExact } from "../money";
import { formatFcfa, type PackageId } from "../plan";
import { notify } from "./notifications";
import { getRules } from "./rules";
import { recordBonus } from "./wallet";

/**
 * Direct sponsorship bonus: the sponsor's package rate on the FCFA value of
 * the PV in the package their recruit bought.
 *   Ring sponsor, Index recruit (75 PV): 75 × 500 × 35% = 13 125 FCFA
 */
export function directBonus(recruitPv: number, pvValue: number, sponsorDirectBps: number) {
  return applyBps(pvToFcfaExact(recruitPv, pvValue), sponsorDirectBps);
}

/**
 * Pays the sponsor when a recruit's package is confirmed. A sponsor whose own
 * package is not yet confirmed earns it as pending; activation approves it.
 */
export async function payDirectBonus(
  recruit: Pick<MemberDoc, "memberCode" | "fullName" | "packageId" | "sponsorCode">,
  orderId: string,
  session: ClientSession
) {
  if (!recruit.sponsorCode) return null;
  const rules = await getRules(session);
  const sponsor = await Member.findOne({ memberCode: recruit.sponsorCode })
    .select("memberCode packageId status")
    .session(session)
    .lean<Pick<MemberDoc, "memberCode" | "packageId" | "status">>();
  if (!sponsor || sponsor.status === "suspended") return null;

  const sponsorPkg = rules.packages[sponsor.packageId as PackageId];
  const recruitPkg = rules.packages[recruit.packageId as PackageId];
  const amount = directBonus(recruitPkg.pv, rules.pvValue, sponsorPkg.directBps);
  const active = sponsor.status === "active";

  const entry = await recordBonus(
    {
      member: sponsor.memberCode,
      type: "DIRECT_SPONSORSHIP",
      amount,
      pv: recruitPkg.pv,
      rateBps: sponsorPkg.directBps,
      status: active ? "approved" : "pending",
      sourceType: "member",
      sourceId: recruit.memberCode,
      fromMember: recruit.memberCode,
      generation: null,
      details: {
        order: orderId,
        recruitPackage: recruit.packageId,
        recruitPv: recruitPkg.pv,
        pvValue: rules.pvValue,
        sponsorPackage: sponsor.packageId,
        pendingReason: active ? null : "sponsor_inactive",
        rulesVersion: rules.version,
      },
      description: `Parrainage direct de ${recruit.fullName} (${recruitPkg.name}, ${recruitPkg.pv} PV) à ${sponsorPkg.directBps / 100} %`,
      key: `direct:${recruit.memberCode}`,
    },
    session
  );

  if (entry) {
    await notify(
      session,
      sponsor.memberCode,
      "bonus_earned",
      "Bonus de parrainage direct",
      `${recruit.fullName} a activé son pack ${recruitPkg.name} : ${formatFcfa(amount)}${active ? "" : " (en attente de l'activation de votre pack)"}.`,
      "/dashboard/bonus?tab=direct"
    );
  }
  return entry;
}
