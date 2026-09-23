import type { PipelineStage } from "mongoose";
import { BonusEntry, Member, Order, Payout, PvEntry, type BonusType, type MemberDoc } from "../models";
import { calculateMemberAwards, gradeOf } from "./awards";
import { getBinaryState, groupPv, personalPv } from "./binary";
import { fastCumulationProgress } from "./fastCumulation";
import { getGenerationStats, networkSummary } from "./network";
import { unreadCount } from "./notifications";
import { getRules } from "./rules";
import { earningsByType, getWallet } from "./wallet";
import type { PackageId } from "../plan";

/**
 * Everything the member home screen shows, gathered in one server call
 * instead of a dozen requests from the browser.
 */
export async function getDashboard(memberCode: string) {
  const member = await Member.findOne({ memberCode }).lean<MemberDoc>();
  if (!member) return null;
  const rules = await getRules();

  const [own, group, network, generations, binary, wallet, earnings, awards, fast, unread, recent, packageOrder, sponsor] =
    await Promise.all([
      personalPv(memberCode),
      groupPv(memberCode),
      networkSummary(memberCode),
      getGenerationStats(memberCode),
      getBinaryState(memberCode),
      getWallet(memberCode),
      earningsByType(memberCode),
      calculateMemberAwards(memberCode),
      fastCumulationProgress(memberCode),
      unreadCount(memberCode),
      BonusEntry.find({ member: memberCode }).sort({ createdAt: -1 }).limit(6).lean(),
      Order.findOne({ buyer: memberCode, kind: "package" }).lean(),
      member.sponsorCode
        ? Member.findOne({ memberCode: member.sponsorCode }).select("fullName memberCode").lean<{ fullName: string; memberCode: string }>()
        : null,
    ]);

  const pkg = rules.packages[member.packageId as PackageId];
  return {
    member: {
      memberCode: member.memberCode,
      fullName: member.fullName,
      firstName: member.fullName.split(" ")[0],
      email: member.email ?? null,
      phone: member.phone,
      city: member.city ?? null,
      avatarUrl: member.avatarUrl ?? null,
      status: member.status,
      createdAt: member.createdAt,
      activatedAt: member.activatedAt ?? null,
      sponsor,
      placementParent: member.placementParent,
      position: member.position,
      sponsorLeg: member.sponsorLeg,
    },
    package: pkg,
    rules: { pvValue: rules.pvValue, pairPv: rules.pairPv, generationLimit: rules.generationLimit },
    grade: awards ? gradeOf(awards.awards) : null,
    personalPv: own,
    groupPv: group,
    network,
    generations,
    binary,
    wallet,
    earnings,
    awards: awards?.awards ?? [],
    fastCumulation: fast,
    unread,
    recent,
    packageOrder: packageOrder
      ? { number: packageOrder.number, total: packageOrder.total, paymentStatus: packageOrder.paymentStatus }
      : null,
  };
}

export type Dashboard = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;

/* ---- Payment history: bonuses and withdrawals in one list -------------- */

export type HistoryRow = {
  id: string;
  kind: "bonus" | "payout";
  type: string;
  reference: string;
  amount: number; // + credit, − debit
  status: string;
  description: string;
  createdAt: Date;
};

export async function paymentHistory(
  memberCode: string,
  opts: { page?: number; perPage?: number; type?: BonusType | "PAYOUT"; status?: string } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 20));
  const bonusMatch: Record<string, unknown> = { member: memberCode };
  if (opts.type && opts.type !== "PAYOUT") bonusMatch.type = opts.type;
  if (opts.status) bonusMatch.status = opts.status;
  const payoutMatch: Record<string, unknown> = { member: memberCode };
  if (opts.status) payoutMatch.status = opts.status;

  const pipeline: PipelineStage[] = [];
  if (opts.type === "PAYOUT") {
    pipeline.push({ $match: { _id: null } });
  } else {
    pipeline.push({ $match: bonusMatch });
  }
  pipeline.push(
    {
      $project: {
        kind: { $literal: "bonus" },
        type: "$type",
        reference: "$sourceId",
        amount: "$amount",
        status: "$status",
        description: "$description",
        createdAt: 1,
      },
    },
    ...(opts.type && opts.type !== "PAYOUT"
      ? []
      : [
          {
            $unionWith: {
              coll: Payout.collection.name,
              pipeline: [
                { $match: payoutMatch },
                {
                  $project: {
                    kind: { $literal: "payout" },
                    type: { $literal: "PAYOUT" },
                    reference: "$reference",
                    amount: { $multiply: ["$amount", -1] },
                    status: "$status",
                    description: { $concat: ["Retrait vers ", "$destination"] },
                    createdAt: 1,
                  },
                },
              ],
            },
          },
        ]),
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
        total: [{ $count: "n" }],
      },
    }
  );

  const [res] = await BonusEntry.aggregate(pipeline);
  return {
    items: (res.items as (HistoryRow & { _id: unknown })[]).map(({ _id, ...r }) => ({ ...r, id: String(_id) })),
    total: (res.total[0]?.n as number) ?? 0,
    page,
    perPage,
  };
}

export async function pvLedger(memberCode: string, page = 1, perPage = 20) {
  const [items, total] = await Promise.all([
    PvEntry.find({ member: memberCode }).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    PvEntry.countDocuments({ member: memberCode }),
  ]);
  return { items, total, page, perPage };
}
