import type { ClientSession } from "mongoose";
import { Member, PvEntry, VolumeEntry, type Leg, type MemberDoc } from "../models";
import { getRules } from "./rules";

/**
 * Generations and genealogy, read from the placement tree.
 *
 * Generation numbering counts the member as generation 1, so their two
 * direct placements are generation 2 and the 8th generation is 7 levels
 * below them. Every figure here comes from the `lineage` index, never from a
 * member count.
 */

type Lean = Pick<MemberDoc, "memberCode" | "depth" | "lineage" | "status">;

/** Generation of `descendantCode` counted from `memberCode` as 1, or null if not below them. */
export async function getMemberGeneration(memberCode: string, descendantCode: string) {
  if (memberCode === descendantCode) return 1;
  const [m, d] = await Promise.all([
    Member.findOne({ memberCode }).select("depth").lean<{ depth: number }>(),
    Member.findOne({ memberCode: descendantCode }).select("depth lineage").lean<Lean>(),
  ]);
  if (!m || !d) return null;
  if (!d.lineage.some((s) => s.m === memberCode)) return null;
  return d.depth - m.depth + 1;
}

/** Which leg of `ancestorCode` a member sits on, or null if they are not below them. */
export function legUnder(member: Pick<MemberDoc, "lineage">, ancestorCode: string): Leg | null {
  return member.lineage.find((s) => s.m === ancestorCode)?.leg ?? null;
}

/**
 * Descendants of a member within `levels` levels, optionally restricted to
 * one leg and to active members. `levels = Infinity` means the whole downline.
 */
export function downlineFilter(
  member: Pick<MemberDoc, "memberCode" | "depth">,
  opts: { levels?: number; leg?: Leg; activeOnly?: boolean } = {}
) {
  const filter: Record<string, unknown> = opts.leg
    ? { lineage: { $elemMatch: { m: member.memberCode, leg: opts.leg } } }
    : { "lineage.m": member.memberCode };
  if (opts.levels !== undefined && Number.isFinite(opts.levels)) {
    filter.depth = { $lte: member.depth + opts.levels };
  }
  if (opts.activeOnly) filter.status = "active";
  return filter;
}

export type GenerationStat = {
  generation: number;
  capacity: number;
  memberCount: number;
  activeCount: number;
  pv: number;
  complete: boolean;
  /** Whether volume from this generation still pays this member's binary. */
  binaryApplies: boolean;
};

/**
 * Per-generation counts for generations 2..limit, plus volume that reached
 * this member's legs from each generation.
 */
export async function getGenerationStats(memberCode: string, session?: ClientSession) {
  const rules = await getRules(session);
  const member = await Member.findOne({ memberCode })
    .select("memberCode depth lineage status")
    .session(session ?? null)
    .lean<Lean>();
  if (!member) return null;

  // Sequential on purpose: a transaction session cannot run operations in parallel.
  const counts = await Member.aggregate([
    { $match: downlineFilter(member, { levels: rules.binaryDepth }) },
    {
      $group: {
        _id: "$depth",
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
      },
    },
  ]).session(session ?? null);
  const volume = await VolumeEntry.aggregate([
    { $match: { member: memberCode } },
    { $group: { _id: "$generation", pv: { $sum: "$pv" } } },
  ]).session(session ?? null);

  const byDepth = new Map<number, { total: number; active: number }>(
    counts.map((c) => [c._id as number, { total: c.total, active: c.active }])
  );
  const pvByGen = new Map<number, number>(volume.map((v) => [v._id as number, v.pv]));

  const generations: GenerationStat[] = [];
  for (let g = 2; g <= rules.generationLimit; g++) {
    const row = byDepth.get(member.depth + g - 1) ?? { total: 0, active: 0 };
    const capacity = 2 ** (g - 1);
    generations.push({
      generation: g,
      capacity,
      memberCount: row.total,
      activeCount: row.active,
      pv: pvByGen.get(g) ?? 0,
      complete: row.total >= capacity,
      binaryApplies: true,
    });
  }

  const reached = generations.filter((g) => g.memberCount > 0).at(-1)?.generation ?? 1;
  const withinLimit = generations.reduce((n, g) => n + g.memberCount, 0);
  const activeWithinLimit = generations.reduce((n, g) => n + g.activeCount, 0);
  const deeper = await Member.countDocuments({
    "lineage.m": memberCode,
    depth: { $gt: member.depth + rules.binaryDepth },
  }).session(session ?? null);

  return {
    generationLimit: rules.generationLimit,
    /** The deepest generation with anyone in it, the member being 1. */
    currentGeneration: reached,
    generations,
    withinLimit,
    activeWithinLimit,
    /** People below generation 8: in the network, outside the binary. */
    beyondLimit: deeper,
    capacity: generations.reduce((n, g) => n + g.capacity, 0),
  };
}

/** Headline network figures for a member. */
export async function networkSummary(memberCode: string) {
  const member = await Member.findOne({ memberCode })
    .select("memberCode depth")
    .lean<Pick<MemberDoc, "memberCode" | "depth">>();
  if (!member) return null;
  const [total, active, left, right, leftActive, rightActive, sponsored, sponsoredActive] =
    await Promise.all([
      Member.countDocuments(downlineFilter(member)),
      Member.countDocuments(downlineFilter(member, { activeOnly: true })),
      Member.countDocuments(downlineFilter(member, { leg: "left" })),
      Member.countDocuments(downlineFilter(member, { leg: "right" })),
      Member.countDocuments(downlineFilter(member, { leg: "left", activeOnly: true })),
      Member.countDocuments(downlineFilter(member, { leg: "right", activeOnly: true })),
      Member.countDocuments({ sponsorCode: memberCode }),
      Member.countDocuments({ sponsorCode: memberCode, status: "active" }),
    ]);
  return { total, active, left, right, leftActive, rightActive, sponsored, sponsoredActive };
}

export type NetworkNode = {
  memberCode: string;
  fullName: string;
  packageId: string;
  position: Leg | null;
  generation: number;
  status: string;
  sponsorCode: string | null;
  createdAt: string;
  personalPv: number;
  hasLeft: boolean;
  hasRight: boolean;
};

/**
 * A node and its two children, for lazy expansion of the tree. `viewer` may
 * only open nodes in their own downline (or themselves).
 */
export async function getNodeChildren(viewerCode: string, nodeCode: string) {
  const viewer = await Member.findOne({ memberCode: viewerCode })
    .select("memberCode depth")
    .lean<Pick<MemberDoc, "memberCode" | "depth">>();
  if (!viewer) return null;

  const node =
    nodeCode === viewerCode
      ? { memberCode: viewerCode }
      : await Member.findOne({ memberCode: nodeCode, "lineage.m": viewerCode })
          .select("memberCode")
          .lean<{ memberCode: string }>();
  if (!node) return null; // not theirs to see

  const children = await Member.find({ placementParent: node.memberCode })
    .select("memberCode fullName packageId position depth status sponsorCode createdAt")
    .lean<MemberDoc[]>();
  return describeNodes(children, viewer.depth);
}

async function describeNodes(members: MemberDoc[], viewerDepth: number): Promise<NetworkNode[]> {
  const codes = members.map((m) => m.memberCode);
  const [grandchildren, pv] = await Promise.all([
    Member.find({ placementParent: { $in: codes } })
      .select("placementParent position")
      .lean<{ placementParent: string; position: Leg }[]>(),
    personalPvFor(codes),
  ]);
  return members
    .sort((a, b) => (a.position === "left" ? 0 : 1) - (b.position === "left" ? 0 : 1))
    .map((m) => ({
      memberCode: m.memberCode,
      fullName: m.fullName,
      packageId: m.packageId,
      position: m.position,
      generation: m.depth - viewerDepth + 1,
      status: m.status,
      sponsorCode: m.sponsorCode ?? null,
      createdAt: new Date(m.createdAt).toISOString(),
      personalPv: pv.get(m.memberCode) ?? 0,
      hasLeft: grandchildren.some((g) => g.placementParent === m.memberCode && g.position === "left"),
      hasRight: grandchildren.some((g) => g.placementParent === m.memberCode && g.position === "right"),
    }));
}

/** Members of one generation below the viewer, paginated, for the list view. */
export async function listGeneration(
  viewerCode: string,
  generation: number,
  opts: { page?: number; perPage?: number; leg?: Leg; status?: "active" | "pending" } = {}
) {
  const viewer = await Member.findOne({ memberCode: viewerCode })
    .select("memberCode depth")
    .lean<Pick<MemberDoc, "memberCode" | "depth">>();
  if (!viewer || generation < 2) return { items: [], total: 0 };
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 24));
  const filter: Record<string, unknown> = {
    ...downlineFilter(viewer, { leg: opts.leg }),
    depth: viewer.depth + generation - 1,
  };
  if (opts.status) filter.status = opts.status;
  const [rows, total] = await Promise.all([
    Member.find(filter)
      .sort({ createdAt: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .select("memberCode fullName packageId position depth status sponsorCode createdAt")
      .lean<MemberDoc[]>(),
    Member.countDocuments(filter),
  ]);
  return { items: await describeNodes(rows, viewer.depth), total, page, perPage };
}

export async function personalPvFor(codes: string[]) {
  if (codes.length === 0) return new Map<string, number>();
  const rows = await PvEntry.aggregate([
    { $match: { member: { $in: codes } } },
    { $group: { _id: "$member", pv: { $sum: "$pv" } } },
  ]);
  return new Map<string, number>(rows.map((r) => [r._id, r.pv]));
}
