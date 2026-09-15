import { AWARDS } from "@/lib/plan";
import styles from "./Awards.module.css";

/**
 * A progression, so it is drawn as a rail with real sequence — the one
 * place on this site where numbering the steps is honest.
 */
export function Awards() {
  return (
    <ol className={styles.rail}>
      {AWARDS.map((a, i) => (
        <li key={a.name} className={styles.step}>
          <div className={styles.marker} aria-hidden="true">
            <svg viewBox="0 0 40 40" width="40" height="40">
              <polygon
                points="20,3 35,14 29,33 11,33 5,14"
                fill={a.stone}
                stroke="rgba(255,255,255,.35)"
                strokeWidth="1"
              />
              <polygon points="20,3 29,33 20,20" fill="rgba(255,255,255,.22)" />
              <polygon points="20,3 11,33 20,20" fill="rgba(0,0,0,.14)" />
            </svg>
          </div>
          <div className={styles.body}>
            <div className={styles.head}>
              <h3 className={styles.name}>{a.name}</h3>
              <span className={styles.ordinal}>Level {i + 1} of {AWARDS.length}</span>
            </div>
            <p className={styles.req}>{a.requirement}</p>
            <p className={styles.detail}>{a.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
