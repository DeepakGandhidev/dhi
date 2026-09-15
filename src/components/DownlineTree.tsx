import Link from "next/link";
import { PACKAGE_BY_ID, type PackageId } from "@/lib/plan";
import type { TreeNode } from "@/lib/placement";
import styles from "./DownlineTree.module.css";

/**
 * Three levels of the binary tree, drawn as levels rather than nested boxes
 * so the two legs stay visually symmetrical. Open slots are shown as dashed
 * placeholders, because an empty slot is the useful information: it is where
 * the next person goes.
 */

type Slot = { node: TreeNode | null; key: string; position: "left" | "right" };

function childrenOf(node: TreeNode | null, keyPrefix: string): Slot[] {
  return [
    { node: node?.left ?? null, key: `${keyPrefix}L`, position: "left" as const },
    { node: node?.right ?? null, key: `${keyPrefix}R`, position: "right" as const },
  ];
}

export function DownlineTree({ root, levels = 3 }: { root: TreeNode; levels?: number }) {
  // Build the levels breadth-first, carrying nulls so gaps keep their place.
  const rows: Slot[][] = [[{ node: root, key: "R", position: "left" }]];
  for (let i = 1; i < levels; i++) {
    const prev = rows[i - 1];
    const next: Slot[] = [];
    for (const slot of prev) next.push(...childrenOf(slot.node, slot.key));
    rows.push(next);
  }

  return (
    <div className={styles.scroller}>
      {rows.map((row, level) => (
        <div key={level}>
          {level > 0 ? (
            <div className={styles.level}>
              {row.map((slot) => (
                <div className={styles.branch} key={`c-${slot.key}`}>
                  <Connector position={slot.position} />
                </div>
              ))}
            </div>
          ) : null}

          <div className={styles.level}>
            {row.map((slot) => (
              <div className={styles.branch} key={slot.key}>
                <NodeCard node={slot.node} isRoot={level === 0} position={slot.position} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Connector({ position }: { position: "left" | "right" }) {
  return (
    <svg className={styles.connector} viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true">
      <path
        d={position === "left" ? "M100 0 V11 H50 V22" : "M0 0 V11 H50 V22"}
        stroke="var(--rule)"
        strokeWidth="2"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function NodeCard({
  node,
  isRoot,
  position,
}: {
  node: TreeNode | null;
  isRoot: boolean;
  position: "left" | "right";
}) {
  if (!node) {
    return (
      <div className={styles.node} data-empty="true">
        <span className={styles.emptyLabel}>Open</span>
        <span className={styles.emptyHint}>{position} slot</span>
      </div>
    );
  }

  const pkg = PACKAGE_BY_ID[node.packageId as PackageId];

  return (
    <div className={styles.node} data-you={isRoot}>
      <span className={styles.name} title={node.fullName}>
        {isRoot ? "You" : node.fullName}
      </span>
      <span className={styles.code}>{node.memberCode}</span>
      <span className={styles.pkg}>{pkg?.name ?? node.packageId}</span>
    </div>
  );
}

export function LegSummary({
  left,
  right,
  weaker,
}: {
  left: number;
  right: number;
  weaker: "left" | "right" | "balanced";
}) {
  return (
    <div className={styles.legs}>
      {(
        [
          ["Left leg", left, "left"],
          ["Right leg", right, "right"],
        ] as const
      ).map(([name, count, side]) => (
        <div className={styles.leg} key={side} data-weaker={weaker === side}>
          <span className={`${styles.legNum} num`}>{count}</span>
          <span className={styles.legName}>{name}</span>
          <span className={styles.legNote}>
            {count === 1 ? "1 person" : `${count} people`}
            {weaker === side ? " · your weaker leg" : ""}
            {weaker === "balanced" && count > 0 ? " · balanced" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TreeLegend({ sponsorCode }: { sponsorCode: string | null }) {
  return (
    <p className={styles.depthNote}>
      Dashed boxes are open positions — the next person placed on that leg fills the highest
      one. {sponsorCode ? `You were introduced by ${sponsorCode}.` : "You are the top of this tree."}{" "}
      <Link href="/plan#binary">How the binary works</Link>
    </p>
  );
}
