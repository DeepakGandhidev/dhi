"use client";

import { useState } from "react";
import { t } from "@/i18n/fr";
import { formatDate, formatPv } from "@/lib/format";
import { PACKAGE_BY_ID, type PackageId } from "@/lib/plan";
import { Icon } from "./Icon";
import s from "./NetworkTree.module.css";

export type TreeNode = {
  memberCode: string;
  fullName: string;
  packageId: string;
  position: "left" | "right" | null;
  generation: number;
  status: string;
  sponsorCode: string | null;
  createdAt: string;
  personalPv: number;
  hasLeft: boolean;
  hasRight: boolean;
};

type Loaded = { state: "idle" | "loading" | "error"; children?: TreeNode[] };

/**
 * The binary tree, loaded one level at a time from the server as branches
 * are opened, so a large network never lands in the browser all at once.
 */
export function NetworkTree({ root, maxGeneration }: { root: TreeNode; maxGeneration: number }) {
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<TreeNode | null>(null);

  async function toggle(node: TreeNode) {
    const isOpen = !open[node.memberCode];
    setOpen((o) => ({ ...o, [node.memberCode]: isOpen }));
    if (!isOpen || loaded[node.memberCode]?.children) return;
    setLoaded((l) => ({ ...l, [node.memberCode]: { state: "loading" } }));
    try {
      const res = await fetch(`/api/member/network?node=${encodeURIComponent(node.memberCode)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { children: TreeNode[] };
      setLoaded((l) => ({ ...l, [node.memberCode]: { state: "idle", children: data.children } }));
    } catch {
      setLoaded((l) => ({ ...l, [node.memberCode]: { state: "error" } }));
    }
  }

  function render(node: TreeNode, isRoot = false): React.ReactNode {
    const hasKids = node.hasLeft || node.hasRight;
    const isOpen = Boolean(open[node.memberCode]);
    const entry = loaded[node.memberCode];
    return (
      <li key={node.memberCode} className={s.item}>
        <div className={s.nodeRow}>
          <button
            type="button"
            className={s.toggle}
            onClick={() => toggle(node)}
            disabled={!hasKids}
            aria-expanded={hasKids ? isOpen : undefined}
            aria-label={hasKids ? (isOpen ? "Replier" : "Déplier") : "Aucun membre en dessous"}
          >
            {hasKids ? <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={16} /> : <span className={s.leaf} />}
          </button>
          <button type="button" className={s.node} data-status={node.status} data-root={isRoot} onClick={() => setSelected(node)}>
            <span className={s.dot} aria-hidden="true" />
            <span className={s.nodeMain}>
              <strong>{isRoot ? "Vous" : node.fullName}</strong>
              <span className="num">{node.memberCode}</span>
            </span>
            <span className={s.nodeSide}>
              {node.position && !isRoot ? <span className={s.leg}>{t.legs[node.position]}</span> : null}
              <span className={s.pkg} data-pkg={node.packageId}>
                {PACKAGE_BY_ID[node.packageId as PackageId]?.name}
              </span>
              <span className={s.pv}>{formatPv(node.personalPv)}</span>
            </span>
          </button>
        </div>

        {isOpen ? (
          entry?.state === "loading" ? (
            <p className={s.status}>Chargement…</p>
          ) : entry?.state === "error" ? (
            <p className={s.status} data-error="true">
              Impossible de charger cette branche.{" "}
              <button type="button" className={s.retry} onClick={() => { setOpen((o) => ({ ...o, [node.memberCode]: false })); setLoaded((l) => ({ ...l, [node.memberCode]: { state: "idle" } })); }}>
                Réessayer
              </button>
            </p>
          ) : entry?.children ? (
            <ul className={s.children}>
              {(["left", "right"] as const).map((leg) => {
                const child = entry.children!.find((c) => c.position === leg);
                return child ? (
                  render(child)
                ) : (
                  <li key={`${node.memberCode}-${leg}`} className={s.item}>
                    <div className={s.nodeRow}>
                      <span className={s.toggle} />
                      <span className={s.empty}>
                        {t.legs[leg]} — place libre
                        {node.generation + 1 > maxGeneration ? " (hors binaire)" : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null
        ) : null}
      </li>
    );
  }

  return (
    <div className={s.wrap}>
      <ul className={s.tree}>{render(root, true)}</ul>

      {selected ? (
        <aside className={s.detail} aria-label="Détails du membre">
          <div className={s.detailHead}>
            <strong>{selected.memberCode === root.memberCode ? "Vous" : selected.fullName}</strong>
            <button type="button" className={s.close} onClick={() => setSelected(null)} aria-label="Fermer">
              <Icon name="close" size={18} />
            </button>
          </div>
          <dl>
            <dt>Code</dt>
            <dd className="num">{selected.memberCode}</dd>
            <dt>Pack</dt>
            <dd>{PACKAGE_BY_ID[selected.packageId as PackageId]?.name}</dd>
            <dt>Statut</dt>
            <dd>{t.status[selected.status]}</dd>
            <dt>Génération</dt>
            <dd>{selected.generation}</dd>
            {selected.position ? (
              <>
                <dt>Placement</dt>
                <dd>{t.legs[selected.position]}</dd>
              </>
            ) : null}
            <dt>PV personnel</dt>
            <dd>{formatPv(selected.personalPv)}</dd>
            <dt>Parrain</dt>
            <dd className="num">{selected.sponsorCode ?? "—"}</dd>
            <dt>Inscrit le</dt>
            <dd>{formatDate(selected.createdAt)}</dd>
          </dl>
        </aside>
      ) : null}
    </div>
  );
}
