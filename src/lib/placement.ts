import { Member, type Leg, type LineageStep } from "./models";

/**
 * Binary placement with spillover.
 *
 * Sponsorship and placement are different things. The sponsor decides which
 * leg a new member goes to; the system then walks down that leg and puts them
 * in the first open slot it finds. That overflow is what lets a strong upline
 * leg feed the people beneath it.
 *
 * The search is breadth-first, so a leg fills level by level and stays as
 * balanced as it can rather than growing one long thread.
 */

export type Slot = { parent: string; position: Leg; depth: number; lineage: LineageStep[] };

type Node = { memberCode: string; depth: number; lineage: LineageStep[] };

/** A new member's lineage: the parent's, plus the parent itself. */
const lineageUnder = (parent: Node, position: Leg): LineageStep[] => [
  ...(parent.lineage ?? []),
  { m: parent.memberCode, leg: position },
];

const slot = (parent: Node, position: Leg): Slot => ({
  parent: parent.memberCode,
  position,
  depth: parent.depth + 1,
  lineage: lineageUnder(parent, position),
});

/** The first open slot at or below `rootCode`, searching the `leg` side first. */
export async function findOpenSlot(rootCode: string, leg: Leg): Promise<Slot> {
  const root = await Member.findOne({ memberCode: rootCode })
    .select("memberCode depth lineage")
    .lean<Node>();
  if (!root) throw new Error(`No member with code ${rootCode}`);

  // Level 1: the sponsor's own chosen leg, if it is free.
  const direct = await Member.findOne({ placementParent: rootCode, position: leg })
    .select("memberCode depth lineage")
    .lean<Node>();
  if (!direct) return slot(root, leg);

  // Otherwise walk down that subtree, level by level, taking the first gap.
  let frontier: Node[] = [direct];

  while (frontier.length > 0) {
    const codes = frontier.map((n) => n.memberCode);
    const children = await Member.find({ placementParent: { $in: codes } })
      .select("memberCode depth lineage placementParent position")
      .lean<(Node & { placementParent: string; position: Leg })[]>();

    const taken = new Map<string, Set<Leg>>();
    for (const c of children) {
      if (!taken.has(c.placementParent)) taken.set(c.placementParent, new Set());
      taken.get(c.placementParent)!.add(c.position);
    }

    // Left before right, so slots fill in a predictable order.
    for (const node of frontier) {
      const used = taken.get(node.memberCode) ?? new Set<Leg>();
      if (!used.has("left")) return slot(node, "left");
      if (!used.has("right")) return slot(node, "right");
    }

    frontier = children.map((c) => ({ memberCode: c.memberCode, depth: c.depth, lineage: c.lineage }));
  }

  throw new Error("No open slot found");
}
