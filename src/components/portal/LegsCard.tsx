import Link from "next/link";
import { t } from "@/i18n/fr";
import { formatBps, formatFcfa, formatNumber, formatPv } from "@/lib/format";
import { applyBps } from "@/lib/money";
import { Icon } from "./Icon";
import { ui } from "./ui";
import s from "./LegsCard.module.css";

type Binary = { carryLeft: number; carryRight: number; totalLeft: number; totalRight: number; matchedPv: number; pairs: number };

/**
 * The two branches side by side: what is waiting to be matched on each leg,
 * and what the next pair needs. Totals are lifetime; carry is what is left
 * after every match so far.
 */
export function LegsCard({
  binary,
  rateBps,
  pairPv,
  pvValue,
  active,
}: {
  binary: Binary;
  rateBps: number;
  pairPv: number;
  pvValue: number;
  active: boolean;
}) {
  const max = Math.max(binary.carryLeft, binary.carryRight, pairPv);
  const weak = binary.carryLeft === binary.carryRight ? null : binary.carryLeft < binary.carryRight ? "left" : "right";
  const needed = Math.max(0, pairPv - Math.min(binary.carryLeft, binary.carryRight));
  const perPair = applyBps(pairPv * pvValue, rateBps);

  return (
    <section className={ui.card}>
      <h2 className={ui.sectionTitle}>
        Mes deux branches
        <Link href="/dashboard/bonus?tab=binary" className={ui.sectionLink}>
          Détail binaire
        </Link>
      </h2>
      <div className={s.legs}>
        {(["left", "right"] as const).map((leg) => {
          const carry = leg === "left" ? binary.carryLeft : binary.carryRight;
          const total = leg === "left" ? binary.totalLeft : binary.totalRight;
          return (
            <div key={leg} className={s.leg} data-leg={leg} data-weak={weak === leg}>
              <span className={s.legName}>
                {leg === "left" ? t.stats.leftPv : t.stats.rightPv}
                {weak === leg ? <span className={s.weakTag}>branche faible</span> : null}
              </span>
              <span className={`${s.legValue} num`}>{formatPv(carry)}</span>
              <div className={s.bar}>
                <div style={{ height: `${Math.max(4, (carry / max) * 100)}%` }} />
              </div>
              <span className={s.legTotal}>Cumul : {formatNumber(total)} PV</span>
            </div>
          );
        })}
      </div>
      <div className={s.foot}>
        <div>
          <span className={ui.statLabel}>PV appariés</span>
          <strong className="num">{formatPv(binary.matchedPv)}</strong>
        </div>
        <div>
          <span className={ui.statLabel}>Paires</span>
          <strong className="num">{formatNumber(binary.pairs)}</strong>
        </div>
        <div>
          <span className={ui.statLabel}>Par paire</span>
          <strong className="num">{formatFcfa(perPair)}</strong>
        </div>
      </div>
      <p className={s.hint}>
        <Icon name="info" size={15} />
        {active
          ? `${pairPv} PV à gauche + ${pairPv} PV à droite = 1 paire, payée ${formatBps(rateBps)}. ${
              weak
                ? `Il manque ${needed} PV sur la branche ${weak === "right" ? "droite" : "gauche"} pour la prochaine paire`
                : `Il faut ${needed} PV de chaque côté pour la prochaine paire`
            } ; le volume non apparié est reporté.`
          : "Votre volume s'accumule dès maintenant et sera apparié dès l'activation de votre pack."}
      </p>
    </section>
  );
}
