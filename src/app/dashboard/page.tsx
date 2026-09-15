import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Member } from "@/lib/models";
import { loadDownline, legTotals } from "@/lib/placement";
import { DownlineTree, LegSummary, TreeLegend } from "@/components/DownlineTree";
import { SignOutButton } from "@/components/SignOutButton";
import { GENERATIONS, PACKAGE_BY_ID, formatPct, type PackageId } from "@/lib/plan";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Your network",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const member = await currentMember();
  if (!member) redirect("/login");

  await connectToDatabase();

  const [downline, legs, recruits] = await Promise.all([
    loadDownline(member.memberCode, 5),
    legTotals(member.memberCode),
    Member.find({ sponsorCode: member.memberCode })
      .sort({ createdAt: -1 })
      .select("fullName memberCode packageId position placementParent createdAt")
      .lean<{ fullName: string; memberCode: string; packageId: PackageId; createdAt: string }[]>(),
  ]);

  const pkg = PACKAGE_BY_ID[member.packageId as PackageId];
  const total = legs.left + legs.right;
  const spilled = member.sponsorCode && member.placementParent !== member.sponsorCode;

  return (
    <section className="section section--tight">
      <div className="shell">
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>{member.fullName.split(" ")[0]}&rsquo;s network</h1>
            <p className={styles.sub}>
              {pkg.name} package · {formatPct(pkg.direct)} direct · {formatPct(pkg.binary)} per pair
            </p>
          </div>
          <div className={styles.codeCard}>
            <span className={styles.codeLabel}>Your member code</span>
            <span className={`${styles.codeValue} num`}>{member.memberCode}</span>
          </div>
        </div>

        <div className={styles.facts}>
          <div className={styles.fact}>
            <span className={`${styles.factNum} num`}>{total}</span>
            <span className={styles.factLabel}>
              {total === 1 ? "person below you" : "people below you"}
            </span>
          </div>
          <div className={styles.fact}>
            <span className={`${styles.factNum} num`}>{recruits.length}</span>
            <span className={styles.factLabel}>
              {recruits.length === 1 ? "person you sponsored" : "people you sponsored"}
            </span>
          </div>
          <div className={styles.fact}>
            <span className={`${styles.factNum} num`}>
              {downline?.perGeneration.filter((n) => n > 0).length ?? 0} of 5
            </span>
            <span className={styles.factLabel}>Generations started</span>
          </div>
          <div className={styles.fact}>
            <span className={`${styles.factNum} num`}>
              {member.status === "active" ? "Active" : "Pending"}
            </span>
            <span className={styles.factLabel}>
              {member.status === "active" ? "Package confirmed" : "Awaiting payment"}
            </span>
          </div>
        </div>

        {/* Legs */}
        <div className={styles.block}>
          <h2 className={styles.sectionHead}>Your two legs</h2>
          <LegSummary left={legs.left} right={legs.right} weaker={legs.weaker} />
        </div>

        {/* The tree */}
        <div className={styles.block}>
          <h2 className={styles.sectionHead}>Where everyone sits</h2>
          {spilled ? (
            <p className={styles.spill}>
              You were sponsored by {member.sponsorCode} but placed under{" "}
              {member.placementParent} — their {member.sponsorLeg} leg was already full, so you
              spilled to the next open position. That is normal in a binary plan.
            </p>
          ) : null}

          {downline ? <DownlineTree root={downline.root} levels={3} /> : null}
          <TreeLegend sponsorCode={member.sponsorCode ?? null} />
        </div>

        {/* Generations */}
        <div className={styles.block}>
          <h2 className={styles.sectionHead}>Your five generations</h2>
          <div className={styles.genTable}>
            {GENERATIONS.map((g, i) => {
              const filled = downline?.perGeneration[i] ?? 0;
              return (
                <div className={styles.genRow} key={g.level}>
                  <span>Generation {g.level}</span>
                  <span className="num">
                    {filled} / {g.people}
                  </span>
                  <span>{filled === g.people ? "complete" : `${g.people - filled} to go`}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct recruits */}
        <div className={styles.block}>
          <h2 className={styles.sectionHead}>People you sponsored</h2>
          {recruits.length === 0 ? (
            <div className={styles.empty}>
              <strong>You haven&rsquo;t sponsored anyone yet.</strong>
              Share your member code — whoever registers with it is credited to you, and you
              earn {formatPct(pkg.direct)} of their package volume.
              <div className={styles.shareRow} style={{ justifyContent: "center" }}>
                <Link href="/packages" className="btn btn--ghost">
                  See what they can join on
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.recruits}>
              {recruits.map((r) => (
                <div className={styles.recruit} key={r.memberCode}>
                  <span>
                    <span className={styles.recruitName}>{r.fullName}</span>{" "}
                    <span className={styles.recruitCode}>{r.memberCode}</span>
                  </span>
                  <span className={styles.recruitPkg}>
                    {PACKAGE_BY_ID[r.packageId]?.name ?? r.packageId}
                  </span>
                  <span className={styles.recruitPkg}>
                    {new Date(r.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <SignOutButton />
      </div>
    </section>
  );
}
