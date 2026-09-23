import Link from "next/link";
import { HandHero } from "@/components/HandHero";
import { BinaryCalculator } from "@/components/BinaryCalculator";
import { RateTable } from "@/components/RateTable";
import { Generations } from "@/components/Generations";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { IMAGES } from "@/lib/images";
import {
  PACKAGE_BY_ID,
  PAIR_PV,
  PV_VALUE,
  binaryEarnings,
  directEarnings,
  formatFcfa,
  formatPct,
  pvToFcfa,
} from "@/lib/plan";
import styles from "./page.module.css";

export default function Home() {
  // The worked example from the plan, computed rather than typed by hand.
  const ring = PACKAGE_BY_ID.ring;
  const onePair = binaryEarnings(ring, PAIR_PV, PAIR_PV);
  const direct = directEarnings(ring, PACKAGE_BY_ID.index);
  const month = binaryEarnings(ring, 100, 50);

  return (
    <>
      <HandHero />

      {/* What members actually sell */}
      <section className="section">
        <div className="shell">
          <div className={styles.productsGrid}>
            <div className={styles.productsArt}>
              <Photo
                src={IMAGES.productsFlatlay.src}
                alt={IMAGES.productsFlatlay.alt}
                width={520}
                className={styles.tall}
                priority
              />
              <Photo
                src={IMAGES.soap.src}
                alt={IMAGES.soap.alt}
                width={360}
                className={styles.square}
              />
              <div className={styles.stat}>
                <div className={`${styles.statNum} num`}>25 PV</div>
                <div className={styles.statLabel}>
                  = {formatFcfa(pvToFcfa(PAIR_PV))} of volume
                </div>
              </div>
            </div>

            <div>
              <h2 className={styles.headTitle}>
                Everything starts with a product someone wanted anyway.
              </h2>
              <p className="lede">
                Every DHI package is stock: cosmetics, skincare and personal care you sell,
                use, or both. Points follow the products — each 25 PV of volume is{" "}
                <span className="num">{formatFcfa(pvToFcfa(PAIR_PV))}</span> — so the bonuses
                below are never paid on recruitment alone.
              </p>
              <p className="lede">
                Your package also sets your own discount, from{" "}
                {formatPct(PACKAGE_BY_ID.little.discount)} on Little to{" "}
                {formatPct(PACKAGE_BY_ID.thumb.discount)} on Thumb, on everything you reorder.
              </p>
              <Link href="/packages" className="btn btn--ghost">
                Compare the five packages
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The full rate matrix */}
      <section className="section section--tight">
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.headTitle}>The whole plan on one screen</h2>
            <p className="lede">
              Five packages, three ways each one pays. Bigger packages cost more and return a
              higher percentage on the same activity.
            </p>
          </div>
          <RateTable />
        </div>
      </section>

      {/* Binary: explanation then live calculator */}
      <section className="section" id="binary">
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.headTitle}>Two legs. The weaker one pays.</h2>
            <p className="lede">
              Everyone you sponsor goes to your left or your right. When {PAIR_PV} PV on one
              side meets {PAIR_PV} PV on the other, that is one pair — and a pair is what
              earns. Move the sliders and watch the pairs form.
            </p>
          </div>
          <BinaryCalculator />
        </div>
      </section>

      {/* The worked example, spelled out */}
      <section className="section section--tight">
        <div className="shell">
          <div className={styles.example}>
            <div>
              <h2 className={styles.headTitle}>One month on a Ring package</h2>
              <p className="lede">
                You sponsored one person on an Index package. Your left leg built{" "}
                <span className="num">100 PV</span>, your right leg{" "}
                <span className="num">50 PV</span>. Here is the arithmetic, with nothing
                hidden.
              </p>
              <p style={{ fontSize: "var(--t-s)", color: "var(--text-muted)" }}>
                Ring pays {formatPct(ring.direct)} on direct sponsorship and{" "}
                {formatPct(ring.binary)} on each pair. One pair is{" "}
                <span className="num">{PAIR_PV} × {PV_VALUE} = {formatFcfa(pvToFcfa(PAIR_PV))}</span>,
                so {formatPct(ring.binary)} of it is{" "}
                <span className="num">{formatFcfa(onePair.perPair)}</span>.
              </p>
            </div>

            <div className={styles.sum}>
              <div className={styles.sumLine}>
                <span>Direct bonus — one Index recruit ({PACKAGE_BY_ID.index.pv} PV)</span>
                <span className="num">{formatFcfa(direct.total)}</span>
              </div>
              <div className={styles.sumLine}>
                <span>
                  Binary — {month.pairs} pairs × {formatFcfa(month.perPair)}
                </span>
                <span className="num">{formatFcfa(month.total)}</span>
              </div>
              <div className={styles.sumLine}>
                <span>Carried to next cycle</span>
                <span className="num">{month.carryLeft} PV left</span>
              </div>
              <div className={styles.sumTotal}>
                <span className={styles.sumTotalLabel}>Paid this cycle</span>
                <span className={`${styles.sumTotalNum} num`}>
                  {formatFcfa(direct.total + month.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Generations */}
      <section className="section" id="generations" style={{ background: "var(--paper-deep)" }}>
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.headTitle}>Eight generations deep</h2>
            <p className="lede">
              Two people, then four, then eight. Each generation doubles the one above it, and
              the binary bonus reaches all five.
            </p>
          </div>
          <Generations />
        </div>
      </section>

      {/* Voices */}
      <section className="section">
        <div className="shell">
          <div className={styles.head}>
            <h2 className={styles.headTitle}>Built by people who sell, then teach</h2>
            <p className="lede">
              The members who last are the ones who train their first two properly. Your legs
              only grow as fast as the people in them.
            </p>
          </div>

          <div className={styles.voices}>
            <div className={styles.voice}>
              <Photo
                src={IMAGES.memberOne.src}
                alt={IMAGES.memberOne.alt}
                width={420}
                height={525}
                className={styles.voicePhoto}
                tone="warm"
              />
              <blockquote className={styles.voiceQuote}>
                “I started on Index with three products and sold them in a week. The second
                month I understood that my weak leg was the whole job.”
              </blockquote>
              <span className={styles.voiceWho}>Ring member, Douala · two years with DHI</span>
            </div>

            <div className={styles.voice}>
              <Photo
                src={IMAGES.memberTwo.src}
                alt={IMAGES.memberTwo.alt}
                width={420}
                height={525}
                className={styles.voicePhoto}
                tone="indigo"
              />
              <blockquote className={styles.voiceQuote}>
                “Thumb was a serious decision. Sixty-four products is a shop. But at 50% on
                every person I sponsor, it paid for itself before the stock ran out.”
              </blockquote>
              <span className={styles.voiceWho}>Thumb member, Yaoundé · Sapphire award</span>
            </div>

            <div className={`${styles.voice} ${styles.voiceWide}`}>
              <Photo
                src={IMAGES.training.src}
                alt={IMAGES.training.alt}
                width={1100}
                height={480}
                className={styles.trainingShot}
              />
              <span className={styles.voiceWho}>
                Weekly leg-planning session — where members map who goes left and who goes right.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Close */}
      <section className="section dark">
        <div className="shell">
          <div className={styles.close}>
            <div>
              <h2 className={styles.closeTitle}>
                Pick a finger.
                <br />
                Start the hand.
              </h2>
              <p className="lede" style={{ color: "#b9c0e6" }}>
                Registration takes a few minutes. You will get a member code to give the
                people you sponsor, and a side to place each of them on.
              </p>
              <Link href="/join" className="btn btn--primary">
                Join DHI
              </Link>
            </div>

            <ol className={styles.closeSteps}>
              {[
                "Choose your package and pay once",
                "Sponsor one person left and one right",
                "Earn your direct bonus immediately",
                "Match 25 PV against 25 PV for each pair",
                "Complete eight generations for Star and Fast Cumulation",
              ].map((step, i) => (
                <Reveal key={step} as="li" delay={i * 80} className={styles.closeStep}>
                  <span className={`${styles.closeStepNum} num`}>{i + 1}</span>
                  <span>{step}</span>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
