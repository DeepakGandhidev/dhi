import { BonusEntry, Member, Order, generateMemberCode, type Leg, type MemberDoc } from "../models";
import { findOpenSlot } from "../placement";
import { formatFcfa, type PackageId } from "../plan";
import { creditPv, runMatching } from "./binary";
import { payDirectBonus } from "./direct";
import { notify } from "./notifications";
import { nextOrderNumber } from "./counters";
import { settleUpline } from "./settle";
import { getRules } from "./rules";
import { approveBonus } from "./wallet";
import { BusinessError, withTx } from "./tx";

export type Registration = {
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  passwordHash: string;
  packageId: PackageId;
  sponsorLeg: Leg;
  sponsorCode?: string;
};

/**
 * Creates the member, places them, and opens their package order awaiting
 * payment. Nothing is paid yet: bonuses start at activation, when the office
 * confirms the package payment.
 */
export async function registerMember(value: Registration) {
  if (value.sponsorCode) {
    const sponsor = await Member.findOne({ memberCode: value.sponsorCode })
      .select("memberCode status")
      .lean<{ memberCode: string; status: string }>();
    if (!sponsor || sponsor.status === "suspended") {
      throw new BusinessError("No member has that code. Check it with your sponsor.", 422, "sponsorCode");
    }
  } else {
    const rootExists = await Member.exists({ placementParent: { $type: "null" } });
    if (rootExists) {
      throw new BusinessError(
        "DHI already has members, so a sponsor code is required. Ask the person who introduced you for their code.",
        422,
        "sponsorCode"
      );
    }
  }

  // Two people can race for the same slot. The unique index rejects the
  // loser, so we re-run the search rather than hand out a duplicate position.
  // Each round at most one racer wins a slot, so the retry budget has to
  // exceed the number of people who might register under one leg at once.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 25; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, Math.random() * 40 * Math.min(attempt, 5)));
    const slot = value.sponsorCode
      ? await findOpenSlot(value.sponsorCode, value.sponsorLeg)
      : { parent: null, position: null, depth: 0, lineage: [] };

    try {
      return await withTx(async (session) => {
        const rules = await getRules(session);
        const pkg = rules.packages[value.packageId];
        const [member] = await Member.create(
          [
            {
              fullName: value.fullName,
              phone: value.phone,
              email: value.email,
              city: value.city,
              packageId: value.packageId,
              passwordHash: value.passwordHash,
              sponsorCode: value.sponsorCode ?? null,
              sponsorLeg: value.sponsorLeg,
              placementParent: slot.parent,
              position: slot.position,
              depth: slot.depth,
              lineage: slot.lineage,
              memberCode: generateMemberCode(),
            },
          ],
          { session }
        );

        await Order.create(
          [
            {
              number: await nextOrderNumber(session),
              kind: "package",
              buyer: member.memberCode,
              packageId: value.packageId,
              items: [
                {
                  product: null,
                  slug: `pack-${value.packageId}`,
                  name: `Pack ${pkg.name}`,
                  unitPrice: pkg.amount,
                  qty: 1,
                  discountBps: 0,
                  discount: 0,
                  lineTotal: pkg.amount,
                  pv: pkg.pv,
                  affiliateBps: 0,
                },
              ],
              subtotal: pkg.amount,
              discount: 0,
              total: pkg.amount,
              pvTotal: pkg.pv,
              paymentMethod: "mobile_money",
              history: [{ status: "pending", at: new Date(), by: member.memberCode }],
            },
          ],
          { session }
        );

        if (value.sponsorCode) {
          await notify(
            session,
            value.sponsorCode,
            "new_referral",
            "Nouveau filleul",
            `${member.fullName} s'est inscrit avec votre code (pack ${pkg.name}). Votre bonus sera versé à la confirmation de son paiement.`,
            "/dashboard/reseau"
          );
        }
        return member.toObject() as MemberDoc;
      });
    } catch (err) {
      lastError = err;
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  console.error("[members] could not place member", lastError);
  throw new BusinessError("We could not place you in the network. Try again in a moment.", 500);
}

/**
 * Confirms a member's package payment. In one transaction:
 * member → active, package order → paid, package PV credited (which feeds
 * the binary of every ancestor within the generation limit), sponsor's
 * direct bonus, any bonuses they earned while pending approved, their own
 * carried volume matched, then Fast Cumulation and awards up the line.
 */
export async function activateMember(memberCode: string, by: string, paymentRef?: string) {
  return withTx(async (session) => {
    const member = await Member.findOneAndUpdate(
      { memberCode, status: "pending" },
      { $set: { status: "active", activatedAt: new Date() } },
      { new: true, session }
    ).lean<MemberDoc>();
    if (!member) {
      const exists = await Member.exists({ memberCode }).session(session);
      throw new BusinessError(exists ? "Ce membre est déjà actif." : "Membre introuvable.", exists ? 409 : 404);
    }

    const rules = await getRules(session);
    const pkg = rules.packages[member.packageId as PackageId];
    const order = await Order.findOneAndUpdate(
      { buyer: memberCode, kind: "package" },
      {
        $set: { paymentStatus: "paid", status: "delivered", paymentRef: paymentRef ?? null },
        $push: { history: { status: "paid", at: new Date(), by, note: paymentRef } },
      },
      { new: true, session }
    );
    const orderId = String(order?._id ?? `legacy:${memberCode}`);

    await creditPv(
      {
        member: memberCode,
        pv: pkg.pv,
        type: "package_purchase",
        sourceType: "order",
        sourceId: orderId,
        key: `package:${memberCode}`,
        createdBy: by,
        note: `Pack ${pkg.name}`,
      },
      session
    );

    await payDirectBonus(member, orderId, session);

    // Bonuses they earned before their own package was confirmed.
    const waiting = await BonusEntry.find({
      member: memberCode,
      status: "pending",
      "details.pendingReason": "sponsor_inactive",
    })
      .select("_id")
      .session(session)
      .lean();
    for (const w of waiting) await approveBonus(String(w._id), by, session, "Pack confirmé");

    await runMatching(memberCode, session, rules);

    await notify(
      session,
      memberCode,
      "member_activated",
      "Votre pack est activé",
      `Paiement de ${formatFcfa(pkg.amount)} confirmé. Vos ${pkg.pv} PV sont crédités et vos bonus sont actifs.`,
      "/dashboard"
    );
    if (member.sponsorCode) {
      await notify(
        session,
        member.sponsorCode,
        "member_activated",
        "Filleul activé",
        `${member.fullName} est maintenant actif (pack ${pkg.name}).`,
        "/dashboard/reseau"
      );
    }

    await settleUpline(member, session);
    return member;
  });
}

export async function suspendMember(memberCode: string, suspend: boolean) {
  const res = await Member.updateOne(
    { memberCode, status: suspend ? "active" : "suspended" },
    { $set: { status: suspend ? "suspended" : "active" } }
  );
  if (res.modifiedCount !== 1) throw new BusinessError("Statut inchangé.", 409);
}
