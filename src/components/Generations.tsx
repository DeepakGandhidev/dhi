import { GENERATIONS, NETWORK_BELOW, NETWORK_TOTAL } from "@/lib/plan";
import { Reveal } from "./Reveal";
import styles from "./Generations.module.css";

/**
 * The doubling, drawn as it actually behaves: each generation is twice
 * the row above, and the rows physically get wider down the page.
 */
export function Generations() {
  return (
    <div className={styles.wrap}>
      <div className={styles.stack}>
        <Reveal className={styles.you}>
          <span className={styles.youDot} />
          <span className={styles.youLabel}>You · generation 1</span>
        </Reveal>

        {GENERATIONS.map((g, i) => (
          <Reveal key={g.level} delay={i * 110} className={styles.row}>
            <div className={styles.rowMeta}>
              <span className={styles.rowGen}>Generation {g.level}</span>
              <span className={`${styles.rowCount} num`}>{g.people}</span>
            </div>
            <div className={styles.dots} style={{ "--n": Math.min(g.people, 32) } as React.CSSProperties}>
              {Array.from({ length: g.people }, (_, d) => (
                <span
                  key={d}
                  className={styles.dot}
                  style={{ animationDelay: `${i * 110 + d * 12}ms` }}
                />
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={620} className={styles.total}>
        <div>
          <div className={`${styles.totalNum} num`}>{NETWORK_BELOW}</div>
          <p className={styles.totalLabel}>
            people below you once all eight generations are filled —{" "}
            <span className="num">{NETWORK_TOTAL}</span> positions counting your own.
          </p>
        </div>
        <p className={styles.totalNote}>
          The binary bonus is paid down to the eighth generation. Volume created deeper than
          that still builds your legs; it stops adding to this bonus.
        </p>
      </Reveal>
    </div>
  );
}
