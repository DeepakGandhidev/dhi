import { createHash } from "node:crypto";
import { AffiliateClick, BonusEntry, Member, Order, Product } from "../models";
import { getRules } from "./rules";

/**
 * Affiliate tracking. A click is not a sale: clicks, attributed orders and
 * commissions are separate records, and a commission only becomes payable
 * when its order is delivered (see orders.ts).
 */

export const hashId = (value: string) =>
  createHash("sha256").update(`dhi:${value}`).digest("base64url").slice(0, 32);

export const MEMBER_CODE_RE = /^DHI-[A-Z0-9]{4,10}$/;

/**
 * Records a click on `/marketplace/<slug>?ref=<code>`. Returns null for an
 * invalid referral (unknown or inactive member, unknown product) so nothing
 * is attributed. A repeat click by the same visitor inside the window is
 * stored but flagged, so it never inflates the numbers.
 */
export async function recordClick(input: { ref: string; slug: string; visitorId: string; ip: string }) {
  const ref = input.ref.trim().toUpperCase();
  if (!MEMBER_CODE_RE.test(ref)) return null;

  const [affiliate, product] = await Promise.all([
    Member.findOne({ memberCode: ref, status: "active" }).select("memberCode").lean(),
    Product.findOne({ slug: input.slug, status: "active" }).select("slug").lean(),
  ]);
  if (!affiliate || !product) return null;

  const rules = await getRules();
  const visitor = hashId(input.visitorId);
  const since = new Date(Date.now() - rules.clickDedupeHours * 3600_000);
  const seen = await AffiliateClick.exists({
    affiliate: ref,
    product: input.slug,
    visitor,
    duplicate: false,
    createdAt: { $gte: since },
  });

  const click = await AffiliateClick.create({
    affiliate: ref,
    product: input.slug,
    visitor,
    ipHash: hashId(input.ip),
    duplicate: Boolean(seen),
  });
  return { click, counted: !seen, windowDays: rules.affiliateWindowDays };
}

export async function affiliateStats(memberCode: string) {
  const [clickRows, visitors, orderRows, commissionRows, byProduct] = await Promise.all([
    AffiliateClick.aggregate([
      { $match: { affiliate: memberCode } },
      { $group: { _id: "$duplicate", n: { $sum: 1 } } },
    ]),
    AffiliateClick.distinct("visitor", { affiliate: memberCode }),
    Order.aggregate([
      { $match: { "affiliate.member": memberCode } },
      { $group: { _id: "$paymentStatus", n: { $sum: 1 }, total: { $sum: "$total" } } },
    ]),
    BonusEntry.aggregate([
      { $match: { member: memberCode, type: "AFFILIATE_COMMISSION" } },
      { $group: { _id: "$status", total: { $sum: "$amount" }, n: { $sum: 1 } } },
    ]),
    AffiliateClick.aggregate([
      { $match: { affiliate: memberCode, duplicate: false } },
      { $group: { _id: "$product", clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const clicks = clickRows.find((r) => r._id === false)?.n ?? 0;
  const duplicates = clickRows.find((r) => r._id === true)?.n ?? 0;
  const paid = orderRows.find((r) => r._id === "paid");
  const commission = (s: string) => commissionRows.find((r) => r._id === s)?.total ?? 0;

  return {
    clicks,
    duplicates,
    uniqueVisitors: visitors.length,
    orders: orderRows.reduce((n, r) => n + r.n, 0),
    sales: paid?.n ?? 0,
    salesValue: paid?.total ?? 0,
    conversionRate: clicks > 0 ? (paid?.n ?? 0) / clicks : 0,
    commissionPending: commission("pending"),
    commissionApproved: commission("approved"),
    commissionReversed: commission("reversed"),
    commissionTotal: commission("pending") + commission("approved"),
    topProducts: byProduct.map((p) => ({ slug: p._id as string, clicks: p.clicks as number })),
  };
}
