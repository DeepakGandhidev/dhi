"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./HandHero.module.css";
import {
  PACKAGES,
  formatFcfa,
  formatPct,
  NETWORK_TOTAL,
  PV_VALUE,
  type PackageId,
} from "@/lib/plan";

/* Anatomical order, left to right: thumb, index, middle, ring, little. */
const HAND_ORDER: PackageId[] = ["thumb", "index", "middle", "ring", "little"];

export function HandHero() {
  const [activeId, setActiveId] = useState<PackageId>("ring");
  const active = PACKAGES.find((p) => p.id === activeId)!;

  return (
    <header className={styles.hero}>
      <div className="shell">
        <div className={styles.grid}>
          <div className={styles.copy}>
            <h1 className={styles.title}>
              Five fingers.
              <span className={styles.titleLine2}>One hand of business.</span>
            </h1>
            <p className={styles.lede}>
              DHI International pays you on what your two legs build together. Pick the
              package that matches what you can carry, sponsor to your left and your
              right, and every 25 PV that meets in the middle pays out.
            </p>

            <div className={styles.ctas}>
              <Link href="/join" className="btn btn--primary">
                Join DHI
              </Link>
              <Link href="/plan" className="btn btn--ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,.3)" }}>
                See how the plan pays
              </Link>
            </div>

            <div className={styles.facts}>
              <div className={styles.fact}>
                <span className={`${styles.factNum} num`}>1 PV = {PV_VALUE} FCFA</span>
                <span className={styles.factLabel}>Fixed conversion</span>
              </div>
              <div className={styles.fact}>
                <span className={`${styles.factNum} num`}>{NETWORK_TOTAL} positions</span>
                <span className={styles.factLabel}>Eight generations, you included</span>
              </div>
              <div className={styles.fact}>
                <span className={`${styles.factNum} num`}>Up to 50%</span>
                <span className={styles.factLabel}>Direct sponsorship bonus</span>
              </div>
            </div>
          </div>

          {/* The hand. Each finger is a package; height is the finger's real
              proportion, not the package size — the thumb is short and strongest. */}
          <div className={styles.hand}>
            <div className={styles.fingers} role="group" aria-label="Choose a package">
              {HAND_ORDER.map((id, i) => {
                const pkg = PACKAGES.find((p) => p.id === id)!;
                const isActive = id === activeId;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.finger} ${id === "thumb" ? styles.thumb : ""}`}
                    data-active={isActive}
                    aria-pressed={isActive}
                    onClick={() => setActiveId(id)}
                    onMouseEnter={() => setActiveId(id)}
                    onFocus={() => setActiveId(id)}
                  >
                    <span className={`${styles.barPv} num`}>{pkg.pv} PV</span>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${pkg.height * 100}%`,
                        animationDelay: `${0.25 + i * 0.08}s`,
                      }}
                    >
                      <span className={styles.knuckle} />
                      <span className={styles.barName}>{pkg.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.palm}>
              <span>Left leg</span>
              <span aria-hidden="true">•</span>
              <span>Right leg</span>
            </div>

            <div className={styles.readout} aria-live="polite">
              <div>
                <div className={styles.readoutName}>{active.name}</div>
                <p className={styles.readoutBlurb}>{active.blurb}</p>
              </div>
              <div className={styles.readoutPrice}>
                <div className={`${styles.readoutPriceNum} num`}>{formatFcfa(active.amount)}</div>
                <div className={`${styles.readoutRates} num`}>
                  {active.products} {active.products === 1 ? "product" : "products"} ·{" "}
                  {formatPct(active.direct)} direct ·{" "}
                  {formatPct(active.binary)} binary
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
