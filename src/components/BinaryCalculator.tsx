"use client";

import { useMemo, useState } from "react";
import styles from "./BinaryCalculator.module.css";
import {
  PACKAGES,
  PAIR_PV,
  PV_VALUE,
  binaryEarnings,
  formatFcfa,
  formatPct,
  pvToFcfa,
  type PackageId,
} from "@/lib/plan";

const MAX_PV = 500;

export function BinaryCalculator() {
  const [pkgId, setPkgId] = useState<PackageId>("ring");
  const [left, setLeft] = useState(100);
  const [right, setRight] = useState(50);

  const pkg = PACKAGES.find((p) => p.id === pkgId)!;
  const calc = useMemo(() => binaryEarnings(pkg, left, right), [pkg, left, right]);

  const scale = Math.max(MAX_PV, left, right);
  const pct = (pv: number) => `${(pv / scale) * 100}%`;

  const tickCount = Math.floor(scale / PAIR_PV);

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div>
          <p className="lede" style={{ marginBottom: 12 }}>
            Your package sets the rate. Your weaker leg sets the number of pairs.
          </p>
          <div className={styles.pkgRow} role="group" aria-label="Your package">
            {PACKAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.pkgChip}
                data-on={p.id === pkgId}
                aria-pressed={p.id === pkgId}
                onClick={() => setPkgId(p.id)}
              >
                {p.name} · {formatPct(p.binary)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.legs}>
          {([
            ["Left leg", left, setLeft, calc.carryLeft] as const,
            ["Right leg", right, setRight, calc.carryRight] as const,
          ]).map(([name, value, set, carry]) => (
            <div className={styles.leg} key={name}>
              <div className={styles.legHead}>
                <span className={styles.legName}>{name}</span>
                <span>
                  <span className={`${styles.legPv} num`}>{value} PV</span>{" "}
                  <span className={`${styles.legFcfa} num`}>({formatFcfa(pvToFcfa(value))})</span>
                </span>
              </div>
              <div className={styles.track}>
                <div className={styles.matched} style={{ width: pct(calc.matchedPv) }} />
                <div
                  className={styles.carry}
                  style={{ left: pct(calc.matchedPv), width: pct(carry) }}
                />
                <div className={styles.ticks} aria-hidden="true">
                  {Array.from({ length: tickCount }, (_, i) => (
                    <span
                      key={i}
                      className={styles.tick}
                      style={{ left: pct((i + 1) * PAIR_PV), opacity: (i + 1) * PAIR_PV <= value ? 0.5 : 0.12 }}
                    />
                  ))}
                </div>
              </div>
              <label>
                <span className="visually-hidden" style={{ position: "absolute", left: -9999 }}>
                  {name} volume in PV
                </span>
                <input
                  className={styles.slider}
                  type="range"
                  min={0}
                  max={MAX_PV}
                  step={PAIR_PV}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                />
              </label>
            </div>
          ))}
        </div>

        <div className={styles.legend}>
          <span className={styles.swatch}>
            <span className={styles.swatchBox} style={{ background: "var(--jade)" }} />
            Matched — pays a bonus
          </span>
          <span className={styles.swatch}>
            <span
              className={styles.swatchBox}
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-45deg, rgba(46,52,128,.35) 0 4px, transparent 4px 8px)",
                border: "1px solid var(--rule)",
              }}
            />
            Carried to the next cycle
          </span>
        </div>
      </div>

      <div className={styles.result} aria-live="polite">
        <p className={styles.resultLabel}>Binary bonus this cycle</p>
        <div className={`${styles.payout} num`}>{formatFcfa(calc.total)}</div>

        {calc.pairs === 0 ? (
          <p className={styles.empty}>
            No pair yet. You need at least {PAIR_PV} PV on <em>both</em> legs before anything
            matches — a single strong leg pays nothing on its own.
          </p>
        ) : null}

        <div className={styles.working}>
          <div className={styles.workRow}>
            <span>Weaker leg</span>
            <span className="num">
              {Math.min(left, right)} PV{" "}
              {calc.weakerLeg === "balanced" ? "(balanced)" : `(${calc.weakerLeg})`}
            </span>
          </div>
          <div className={styles.workRow}>
            <span>Pairs formed</span>
            <span className="num">
              {Math.min(left, right)} ÷ {PAIR_PV} = {calc.pairs}
            </span>
          </div>
          <div className={styles.workRow}>
            <span>Value of one pair</span>
            <span className="num">
              {PAIR_PV} × {PV_VALUE} = {formatFcfa(pvToFcfa(PAIR_PV))}
            </span>
          </div>
          <div className={styles.workRow}>
            <span>{pkg.name} rate</span>
            <span className="num">
              {formatPct(pkg.binary)} → {formatFcfa(calc.perPair)} per pair
            </span>
          </div>
          <div className={styles.workRow}>
            <span>Carried forward</span>
            <span className="num">
              {calc.carryLeft} PV left · {calc.carryRight} PV right
            </span>
          </div>
        </div>

        <p className={styles.note}>
          The binary bonus is paid down to your fifth generation. Unmatched volume stays on
          the leg and matches as soon as the other side catches up.
        </p>
      </div>
    </div>
  );
}
