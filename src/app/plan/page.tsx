import type { Metadata } from "next";
import Link from "next/link";
import { BinaryCalculator } from "@/components/BinaryCalculator";
import { Generations } from "@/components/Generations";
import { Reveal } from "@/components/Reveal";
import {
  PACKAGES,
  PACKAGE_BY_ID,
  PAIR_PV,
  PV_VALUE,
  NETWORK_BELOW,
  NETWORK_TOTAL,
  formatFcfa,
  formatPct,
  pvToFcfa,
} from "@/lib/plan";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The plan",
  description:
    "How DHI pays: direct sponsorship from 25% to 50%, a 25 PV binary match to the fifth generation, the Fast Cumulative at 62 people, and personal purchase discounts.",
};

const SECTIONS = [
  { id: "direct", label: "Direct sponsorship" },
  { id: "binary", label: "Binary bonus" },
  { id: "generations", label: "Generations" },
  { id: "fast", label: "Fast Cumulative" },
  { id: "discount", label: "Your discount" },
];

export default function PlanPage() {
  const maxDirect = Math.max(...PACKAGES.map((p) => p.direct));

  return (
    <>
      <section className="section section--tight" style={{ paddingBottom: 0 }}>
        <div className="shell">
          <div style={{ maxWidth: "62ch" }}>
            <h1 className={styles.title}>How the money moves</h1>
            <p className="lede">
              DHI pays on four things: who you bring in, what your two legs match, how deep
              your network runs, and what you buy yourself. One point of volume is always{" "}
              <span className="num">{PV_VALUE} FCFA</span> — that conversion never changes,
              so every figure below can be checked with a calculator.
            </p>
            <nav className={styles.toc} aria-label="On this page">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} className={styles.tocLink}>
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* Direct sponsorship */}
      <section className="section section--tight" id="direct">
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.h2}>Direct sponsorship</h2>
            <p className="lede">
              When someone joins directly under you, you earn a percentage of the PV value of
              the package they bought. Your own package decides that percentage — this is the
              single biggest reason to start higher than you think you need.
            </p>
          </div>

          <Reveal className={styles.ladder}>
            {PACKAGES.map((p) => (
              <div className={styles.rung} key={p.id}>
                <span className={styles.rungName}>{p.name}</span>
                <div className={styles.rungTrack}>
                  <div
                    className={styles.rungFill}
                    style={{ width: `${(p.direct / maxDirect) * 100}%` }}
                  />
                </div>
                <span className={`${styles.rungPct} num`}>{formatPct(p.direct)}</span>
              </div>
            ))}
          </Reveal>

          <p style={{ marginTop: 26, fontSize: "var(--t-s)", color: "var(--text-muted)" }}>
            Worked through: you hold {PACKAGE_BY_ID.thumb.name} at{" "}
            {formatPct(PACKAGE_BY_ID.thumb.direct)}. Someone joins under you on{" "}
            {PACKAGE_BY_ID.middle.name} ({PACKAGE_BY_ID.middle.pv} PV ={" "}
            <span className="num">{formatFcfa(pvToFcfa(PACKAGE_BY_ID.middle.pv))}</span>). Your
            direct bonus is{" "}
            <span className="num">
              {formatFcfa(pvToFcfa(PACKAGE_BY_ID.middle.pv) * PACKAGE_BY_ID.thumb.direct)}
            </span>
            .
          </p>
        </div>
      </section>

      {/* Binary */}
      <section className="section" id="binary" style={{ background: "var(--paper-deep)" }}>
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.h2}>The binary bonus</h2>
            <p className="lede">
              Your network has exactly two sides. Everybody you sponsor, and everybody they
              sponsor, lands on the left or the right. Volume only pays when it{" "}
              <em>matches</em> across the two.
            </p>
          </div>

          {/* The structure, drawn */}
          <div className={styles.tree} aria-hidden="true">
            <span className={styles.node}>You</span>
            <Rungs />
            <div className={`${styles.branch} ${styles.legRow}`}>
              <div className={styles.legCol}>
                <span className={`${styles.node} ${styles.nodeLeg}`}>Left leg</span>
                <div className={styles.pairRow}>
                  <span className={`${styles.node} ${styles.nodeDown}`}>A</span>
                  <span className={`${styles.node} ${styles.nodeDown}`}>B</span>
                </div>
              </div>
              <div className={styles.legCol}>
                <span className={`${styles.node} ${styles.nodeLeg}`}>Right leg</span>
                <div className={styles.pairRow}>
                  <span className={`${styles.node} ${styles.nodeDown}`}>C</span>
                  <span className={`${styles.node} ${styles.nodeDown}`}>D</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", justifyItems: "center" }}>
            <div className={styles.matchBadge}>
              <span className={`${styles.matchSum} num`}>
                {PAIR_PV} PV left + {PAIR_PV} PV right = 1 pair
              </span>
              <span className={styles.matchNote}>
                A pair is worth {formatFcfa(pvToFcfa(PAIR_PV))} of volume. You are paid your
                package rate on that.
              </span>
            </div>
          </div>

          <div style={{ marginTop: "clamp(36px, 5vw, 64px)" }}>
            <BinaryCalculator />
          </div>

          <p style={{ marginTop: 30, fontSize: "var(--t-s)", color: "var(--text-muted)", maxWidth: "62ch" }}>
            Unmatched volume is not lost. If your left leg runs at{" "}
            <span className="num">100 PV</span> and your right at{" "}
            <span className="num">50 PV</span>, two pairs form and{" "}
            <span className="num">50 PV</span> stays on the left, waiting for the right side to
            catch up. This is why balancing the legs matters more than growing one of them.
          </p>
        </div>
      </section>

      {/* Generations */}
      <section className="section" id="generations">
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.h2}>How deep the bonus reaches</h2>
            <p className="lede">
              Two, four, eight, sixteen, thirty-two. The binary bonus is paid through all five
              generations — {NETWORK_BELOW} people below you, {NETWORK_TOTAL} positions
              counting your own.
            </p>
          </div>
          <Generations />
        </div>
      </section>

      {/* Fast Cumulative */}
      <section className="section section--tight" id="fast">
        <div className="shell">
          <div className={styles.fast}>
            <div>
              <div className={`${styles.fastNum} num`}>{NETWORK_BELOW}</div>
              <p className={styles.fastLabel}>people, and the Fast Cumulative unlocks.</p>
            </div>
            <div>
              <h2 className={styles.h2} style={{ color: "var(--paper)" }}>
                Fast Cumulative
              </h2>
              <p style={{ color: "#b9c0e6", fontSize: "var(--t-s)" }}>
                A one-off bonus for completing the structure: all five generations filled,{" "}
                {NETWORK_BELOW} positions below you, both legs carrying their share. It rewards
                finishing the shape rather than running one strong leg.
              </p>
              <p style={{ color: "#8189b8", fontSize: "var(--t-xs)", margin: 0 }}>
                Confirm the current Fast Cumulative amount with your sponsor or the DHI office
                before you plan around it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Discount */}
      <section className="section section--tight" id="discount">
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.h2}>What you pay for your own products</h2>
            <p className="lede">
              Reorders are discounted at the same rate as your binary percentage. It is the
              quietest part of the plan and the one active sellers feel most.
            </p>
          </div>
          <div className={styles.discountGrid}>
            {PACKAGES.map((p) => (
              <div className={styles.discountCell} key={p.id}>
                <span className={`${styles.discountPct} num`}>{formatPct(p.discount)}</span>
                <span className={styles.discountName}>{p.name}</span>
                <span className={styles.discountNote}>
                  Saves {formatFcfa(p.amount * p.discount)} on a {formatFcfa(p.amount)} reorder
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <Link href="/join" className="btn btn--primary">
              Join DHI
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** The two connector lines from "You" down to the legs. */
function Rungs() {
  return (
    <svg
      viewBox="0 0 560 54"
      width="100%"
      style={{ maxWidth: 560, height: 54, display: "block" }}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M280 0 V34 M140 34 H420 M140 34 V54 M420 34 V54"
        stroke="var(--rule)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
