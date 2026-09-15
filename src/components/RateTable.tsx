import { PACKAGES, formatFcfa, formatPct } from "@/lib/plan";
import styles from "./RateTable.module.css";

/**
 * The whole plan as one matrix. Packages across, what you get down.
 * A table, because this genuinely is tabular data.
 */
export function RateTable({ highlight }: { highlight?: string }) {
  const rows = [
    { label: "Products", get: (p: (typeof PACKAGES)[number]) => `${p.products}`, note: "in the pack" },
    { label: "Point value", get: (p: (typeof PACKAGES)[number]) => `${p.pv} PV`, note: "credited on joining" },
    { label: "Price", get: (p: (typeof PACKAGES)[number]) => formatFcfa(p.amount), note: "one payment" },
    { label: "Direct sponsorship", get: (p: (typeof PACKAGES)[number]) => formatPct(p.direct), note: "of each recruit's PV value" },
    { label: "Binary, per 25 PV pair", get: (p: (typeof PACKAGES)[number]) => formatPct(p.binary), note: "to the 5th generation" },
    { label: "Your own purchases", get: (p: (typeof PACKAGES)[number]) => formatPct(p.discount), note: "off every order" },
  ];

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <caption className={styles.caption}>
          Every rate in the DHI plan. Choose a column; read down it.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              <span>What you get</span>
            </th>
            {PACKAGES.map((p) => (
              <th key={p.id} scope="col" data-on={p.id === highlight} className={styles.pkgHead}>
                <span className={styles.pkgName}>{p.name}</span>
                <span className={styles.pkgFinger}>{p.finger}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className={styles.rowHead}>
                <span className={styles.rowLabel}>{row.label}</span>
                <span className={styles.rowNote}>{row.note}</span>
              </th>
              {PACKAGES.map((p) => (
                <td key={p.id} data-on={p.id === highlight} className={`${styles.cell} num`}>
                  {row.get(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
