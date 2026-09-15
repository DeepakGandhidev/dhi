import { Member, type Leg } from "./models";

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

export type Slot = { parent: string; position: Leg; depth: number };

type Node = { memberCode: string; depth: number };

/** The first open slot at or below `rootCode`, searching the `leg` side first. */
export async function findOpenSlot(rootCode: string, leg: Leg): Promise<Slot> {
  const root = await Member.findOne({ memberCode: rootCode })
    .select("memberCode depth")
    .lean<Node>();
  if (!root) throw new Error(`No member with code ${rootCode}`);

  // Level 1: the sponsor's own chosen leg, if it is free.
  const direct = await Member.findOne({ placementParent: rootCode, position: leg })
    .select("memberCode depth")
    .lean<Node>();
  if (!direct) return { parent: rootCode, position: leg, depth: root.depth + 1 };

  // Otherwise walk down that subtree, level by level, taking the first gap.
  let frontier: Node[] = [direct];

  while (frontier.length > 0) {
    const codes = frontier.map((n) => n.memberCode);
    const children = await Member.find({ placementParent: { $in: codes } })
      .select("memberCode depth placementParent position")
      .lean<(Node & { placementParent: string; position: Leg })[]>();

    const taken = new Map<string, Set<Leg>>();
    for (const c of children) {
      if (!taken.has(c.placementParent)) taken.set(c.placementParent, new Set());
      taken.get(c.placementParent)!.add(c.position);
    }

    // Left before right, so slots fill in a predictable order.
    for (const node of frontier) {
      const used = taken.get(node.memberCode) ?? new Set<Leg>();
      if (!used.has("left")) return { parent: node.memberCode, position: "left", depth: node.depth + 1 };
      if (!used.has("right")) return { parent: node.memberCode, position: "right", depth: node.depth + 1 };
    }

    frontier = children.map((c) => ({ memberCode: c.memberCode, depth: c.depth }));
  }

  throw new Error("No open slot found");
}

export type TreeNode = {
  memberCode: string;
  fullName: string;
  packageId: string;
  position: Leg | null;
  depth: number;
  status: string;
  createdAt: string;
  sponsorCode: string | null;
  left: TreeNode | null;
  right: TreeNode | null;
};

/**
 * The subtree under `rootCode`, down to `generations` levels.
 * Fetched level by level so a deep network costs a fixed number of queries
 * rather than one per node.
 */
export async function loadDownline(rootCode: string, generations: number) {
  const root = await Member.findOne({ memberCode: rootCode })
    .select("memberCode fullName packageId position depth status createdAt sponsorCode")
    .lean<Record<string, unknown>>();
  if (!root) return null;

  const toNode = (d: Record<string, unknown>): TreeNode => ({
    memberCode: d.memberCode as string,
    fullName: d.fullName as string,
    packageId: d.packageId as string,
    position: (d.position as Leg) ?? null,
    depth: d.depth as number,
    status: d.status as string,
    createdAt: new Date(d.createdAt as string).toISOString(),
    sponsorCode: (d.sponsorCode as string) ?? null,
    left: null,
    right: null,
  });

  const rootNode = toNode(root);
  const byCode = new Map<string, TreeNode>([[rootNode.memberCode, rootNode]]);
  let frontier = [rootNode.memberCode];
  const perGeneration: number[] = [];

  for (let gen = 0; gen < generations && frontier.length > 0; gen++) {
    const children = await Member.find({ placementParent: { $in: frontier } })
      .select("memberCode fullName packageId position depth status createdAt sponsorCode placementParent")
      .lean<Record<string, unknown>[]>();

    perGeneration.push(children.length);
    const next: string[] = [];

    for (const child of children) {
      const node = toNode(child);
      const parent = byCode.get(child.placementParent as string);
      if (parent) {
        if (node.position === "left") parent.left = node;
        else parent.right = node;
      }
      byCode.set(node.memberCode, node);
      next.push(node.memberCode);
    }
    frontier = next;
  }

  return { root: rootNode, perGeneration, total: byCode.size - 1 };
}

/** How many people sit on each side of a member, to the full depth of the tree. */
export async function legTotals(rootCode: string) {
  const count = async (startCode: string) => {
    let frontier = [startCode];
    let total = 0;
    while (frontier.length > 0) {
      const children = await Member.find({ placementParent: { $in: frontier } })
        .select("memberCode")
        .lean<{ memberCode: string }[]>();
      total += children.length;
      frontier = children.map((c) => c.memberCode);
    }
    return total;
  };

  const [leftChild, rightChild] = await Promise.all([
    Member.findOne({ placementParent: rootCode, position: "left" }).select("memberCode").lean<{ memberCode: string }>(),
    Member.findOne({ placementParent: rootCode, position: "right" }).select("memberCode").lean<{ memberCode: string }>(),
  ]);

  const [left, right] = await Promise.all([
    leftChild ? count(leftChild.memberCode).then((n) => n + 1) : Promise.resolve(0),
    rightChild ? count(rightChild.memberCode).then((n) => n + 1) : Promise.resolve(0),
  ]);

  return { left, right, weaker: left === right ? ("balanced" as const) : left < right ? ("left" as const) : ("right" as const) };
}
