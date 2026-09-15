import type { Metadata } from "next";
import Link from "next/link";
import { RateTable } from "@/components/RateTable";
import { PACKAGES, formatFcfa, formatPct, pvToFcfa } from "@/lib/plan";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "The five DHI membership packages — Little, Index, Ring, Middle and Thumb — with products, PV, price, and the rates each one unlocks.",
};

export default function PackagesPage() {
  return (
    <>
      <section className="section section--tight">
        <div className="shell">
          <div className={styles.intro}>
            <h1 className={styles.title}>Five packages, named for the hand</h1>
            <p className="lede">
              A package is stock plus a position. The products are yours to sell or use; the
              PV is credited to the leg you were placed on. Every rate you earn for the rest
              of your time with DHI is set here.
            </p>
          </div>

          <div className={styles.list}>
            {PACKAGES.map((p) => (
              <article className={styles.pkg} key={p.id}>
                <div className={styles.fingerCol} aria-hidden="true">
                  <div className={styles.fingerBar} style={{ height: `${p.height * 100}%` }} />
                </div>

                <div>
                  <h2 className={styles.name}>{p.name}</h2>
                  <span className={styles.finger}>{p.finger}</span>
                  <p className={styles.blurb}>{p.blurb}</p>
                  <div className={styles.cta}>
                    <Link href={`/join?package=${p.id}`} className="btn btn--ghost">
                      Join on {p.name}
                    </Link>
                  </div>
                </div>

                <div className={styles.rates}>
                  <div className={styles.rate}>
                    <span className={`${styles.rateNum} ${styles.priceNum} num`}>
                      {formatFcfa(p.amount)}
                    </span>
                    <span className={styles.rateLabel}>One payment</span>
                  </div>
                  <div className={styles.rate}>
                    <span className={`${styles.rateNum} num`}>{p.products}</span>
                    <span className={styles.rateLabel}>Products included</span>
                  </div>
                  <div className={styles.rate}>
                    <span className={`${styles.rateNum} num`}>{p.pv} PV</span>
                    <span className={styles.rateLabel}>
                      {formatFcfa(pvToFcfa(p.pv))} of volume
                    </span>
                  </div>
                  <div className={styles.rate}>
                    <span className={`${styles.rateNum} num`}>{formatPct(p.direct)}</span>
                    <span className={styles.rateLabel}>Direct sponsorship</span>
                  </div>
                  <div className={styles.rate}>
                    <span className={`${styles.rateNum} num`}>{formatPct(p.binary)}</span>
                    <span className={styles.rateLabel}>Per 25 PV pair</span>
                  </div>
                  <div className={styles.rate}>
                    <span className={`${styles.rateNum} num`}>{formatPct(p.discount)}</span>
                    <span className={styles.rateLabel}>Off your own orders</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section section--tight ${styles.tableSection}`}>
        <div className="shell">
          <RateTable />
        </div>
      </section>
    </>
  );
}
