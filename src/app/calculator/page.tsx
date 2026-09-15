import type { Metadata } from "next";
import { BinaryCalculator } from "@/components/BinaryCalculator";
import { EarningsCalculator } from "@/components/EarningsCalculator";
import { PV_VALUE, PAIR_PV, formatFcfa, pvToFcfa } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Calculator",
  description:
    "Work out DHI direct sponsorship and binary bonuses at 1 PV = 500 FCFA, for any package and any pair of legs.",
};

export default function CalculatorPage() {
  return (
    <>
      <section className="section section--tight" style={{ paddingBottom: 0 }}>
        <div className="shell">
          <div style={{ maxWidth: "58ch" }}>
            <h1 style={{ fontSize: "var(--t-2xl)", fontStretch: "85%", lineHeight: 0.95, marginBottom: "0.35em" }}>
              Check the numbers yourself
            </h1>
            <p className="lede">
              One point of volume is <span className="num">{PV_VALUE} FCFA</span>. A pair is{" "}
              <span className="num">{PAIR_PV} PV</span> on each side, so one pair is{" "}
              <span className="num">{formatFcfa(pvToFcfa(PAIR_PV))}</span> of volume. Everything
              else is a percentage set by your package.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <h2 style={{ fontSize: "var(--t-xl)", fontStretch: "90%", marginBottom: "0.6em" }}>
            Direct sponsorship
          </h2>
          <EarningsCalculator />
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper-deep)" }}>
        <div className="shell">
          <h2 style={{ fontSize: "var(--t-xl)", fontStretch: "90%", marginBottom: "0.6em" }}>
            Binary matching
          </h2>
          <BinaryCalculator />
        </div>
      </section>
    </>
  );
}
