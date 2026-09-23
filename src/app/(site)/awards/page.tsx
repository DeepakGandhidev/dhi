import type { Metadata } from "next";
import Link from "next/link";
import { Awards } from "@/components/Awards";
import { Generations } from "@/components/Generations";
import { NETWORK_BELOW } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Awards",
  description:
    "The DHI award levels — Star, Emerald, Diamond and Sapphire — what each one asks for and what it rewards.",
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
              Star rewards a complete structure: {NETWORK_BELOW} active people through the
              eighth generation. Emerald, Diamond and Sapphire then ask for a bigger package,
              personally sponsored members who already hold the award below, and accumulated PV
              — a motorcycle, a car, then a house.
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
            What Star looks like
          </h2>
          <p className="lede" style={{ marginBottom: "clamp(26px, 4vw, 44px)" }}>
            Eight full generations, you included. Every position below is somebody being
            trained by the person above them.
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
