"use client";

import { useState } from "react";
import styles from "./EarningsCalculator.module.css";
import {
  PACKAGES,
  PV_VALUE,
  directEarnings,
  formatFcfa,
  formatPct,
  pvToFcfa,
  type PackageId,
} from "@/lib/plan";

export function EarningsCalculator() {
  const [mine, setMine] = useState<PackageId>("ring");
  const [theirs, setTheirs] = useState<PackageId>("index");
  const [count, setCount] = useState(3);

  const myPkg = PACKAGES.find((p) => p.id === mine)!;
  const theirPkg = PACKAGES.find((p) => p.id === theirs)!;
  const one = directEarnings(myPkg, theirPkg);

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Your package</span>
          <div className={styles.chips} role="group" aria-label="Your package">
            {PACKAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.chip}
                data-on={p.id === mine}
                aria-pressed={p.id === mine}
                onClick={() => setMine(p.id)}
              >
                {p.name} · {formatPct(p.direct)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.rowLabel}>The package they join on</span>
          <div className={styles.chips} role="group" aria-label="Their package">
            {PACKAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.chip}
                data-on={p.id === theirs}
                aria-pressed={p.id === theirs}
                onClick={() => setTheirs(p.id)}
              >
                {p.name} · {p.pv} PV
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.rowLabel}>How many people you sponsor directly</span>
          <div className={styles.countRow}>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              aria-label="One fewer person"
            >
              −
            </button>
            <span className={`${styles.countNum} num`}>{count}</span>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={() => setCount((c) => Math.min(50, c + 1))}
              aria-label="One more person"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className={styles.out} aria-live="polite">
        <p className={styles.outLabel}>Direct sponsorship bonus</p>
        <div className={`${styles.outNum} num`}>{formatFcfa(one.total * count)}</div>

        <div className={styles.work}>
          <div className={styles.workRow}>
            <span>{theirPkg.name} package volume</span>
            <span className="num">
              {theirPkg.pv} × {PV_VALUE} = {formatFcfa(pvToFcfa(theirPkg.pv))}
            </span>
          </div>
          <div className={styles.workRow}>
            <span>Your {myPkg.name} rate</span>
            <span className="num">{formatPct(myPkg.direct)}</span>
          </div>
          <div className={styles.workRow}>
            <span>Per person</span>
            <span className="num">{formatFcfa(one.total)}</span>
          </div>
          <div className={styles.workRow}>
            <span>× {count} {count === 1 ? "person" : "people"}</span>
            <span className="num">{formatFcfa(one.total * count)}</span>
          </div>
          <div className={styles.workRow}>
            <span>PV added to your legs</span>
            <span className="num">{theirPkg.pv * count} PV</span>
          </div>
        </div>
      </div>
    </div>
  );
}
