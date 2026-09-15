import type { Metadata } from "next";
import Link from "next/link";
import { Awards } from "@/components/Awards";
import { Generations } from "@/components/Generations";
import { NETWORK_BELOW } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Awards",
  description:
    "The DHI award levels — Star, Emerald, Diamond and Sapphire — and the network each one asks for.",
};

export default function AwardsPage() {
  return (
    <>
      <section className="section section--tight">
        <div className="shell">
          <div style={{ maxWidth: "58ch" }}>
            <h1 style={{ fontSize: "var(--t-2xl)", fontStretch: "85%", lineHeight: 0.95, marginBottom: "0.35em" }}>
              Star, Emerald, Diamond, Sapphire
            </h1>
            <p className="lede">
              Awards mark the shape of your network rather than a sales figure. Each level asks
              you to fill another generation across both legs, and the last one — Sapphire —
              is the same {NETWORK_BELOW} people that unlock the Fast Cumulative bonus.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell" style={{ maxWidth: "min(780px, 100% - 40px)" }}>
          <Awards />
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper-deep)" }}>
        <div className="shell">
          <h2 style={{ fontSize: "var(--t-xl)", fontStretch: "90%", marginBottom: "0.5em" }}>
            What Sapphire looks like
          </h2>
          <p className="lede" style={{ marginBottom: "clamp(26px, 4vw, 44px)" }}>
            Five full generations. Every position below is somebody being trained by the person
            above them.
          </p>
          <Generations />
          <div style={{ marginTop: 40 }}>
            <Link href="/join" className="btn btn--ink">
              Start at generation one
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
