import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { Member } from "@/lib/models";
import { calculateMemberAwards, gradeOf } from "@/lib/services/awards";
import { groupPv, personalPv } from "@/lib/services/binary";
import { getGenerationStats, networkSummary } from "@/lib/services/network";
import { getRules } from "@/lib/services/rules";
import { t } from "@/i18n/fr";
import { formatBps, formatDate, formatNumber, formatPv } from "@/lib/format";
import { AWARD_BY_ID, type PackageId } from "@/lib/plan";
import { Avatar } from "@/components/portal/AppShell";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { PackageBadge, PageHead, StatusPill, ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await currentMember();
  if (!me) redirect("/login");
  const [sponsor, own, group, net, gens, awards, rules] = await Promise.all([
    me.sponsorCode ? Member.findOne({ memberCode: me.sponsorCode }).select("fullName memberCode").lean() : null,
    personalPv(me.memberCode),
    groupPv(me.memberCode),
    networkSummary(me.memberCode),
    getGenerationStats(me.memberCode),
    calculateMemberAwards(me.memberCode),
    getRules(),
  ]);
  const grade = awards ? gradeOf(awards.awards) : null;
  const pkg = rules.packages[me.packageId as PackageId];

  return (
    <div className={ui.page}>
      <PageHead title={t.nav.profile} />

      <section className={`${ui.card} ${ui.cardDark}`} style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
        <Avatar member={{ fullName: me.fullName, avatarUrl: me.avatarUrl ?? null }} size={72} />
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <h2 style={{ fontSize: "var(--t-l)" }}>{me.fullName}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span className="num" style={{ color: "var(--gold)", fontWeight: 700 }}>{me.memberCode}</span>
            <PackageBadge id={me.packageId} />
            <StatusPill status={me.status} />
          </div>
        </div>
      </section>

      <div className={ui.grid2}>
        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Compte</h2>
          <dl className={ui.kv}>
            <dt>{t.stats.memberCode}</dt>
            <dd className="num">{me.memberCode}</dd>
            <dt>E-mail</dt>
            <dd>{me.email || "—"}</dd>
            <dt>Téléphone</dt>
            <dd>{me.phone}</dd>
            <dt>Parrain</dt>
            <dd>{sponsor ? `${sponsor.fullName} (${sponsor.memberCode})` : "—"}</dd>
            <dt>Placement</dt>
            <dd>{me.placementParent ? `${t.legs[me.position ?? "left"]} de ${me.placementParent}` : "Racine"}</dd>
            <dt>Inscription</dt>
            <dd>{formatDate(me.createdAt)}</dd>
            <dt>Activation</dt>
            <dd>{me.activatedAt ? formatDate(me.activatedAt) : "En attente du paiement"}</dd>
          </dl>
        </section>
        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Pack, grade et réseau</h2>
          <dl className={ui.kv}>
            <dt>{t.stats.package}</dt>
            <dd>
              {pkg.name} · {formatBps(pkg.directBps)} / {formatBps(pkg.binaryBps)} / {formatBps(pkg.discountBps)}
            </dd>
            <dt>{t.stats.grade}</dt>
            <dd>{grade ? AWARD_BY_ID[grade].nameFr : t.stats.noGrade}</dd>
            <dt>{t.stats.personalPv}</dt>
            <dd>{formatPv(own)}</dd>
            <dt>{t.stats.groupPv}</dt>
            <dd>{formatPv(group)}</dd>
            <dt>Réseau</dt>
            <dd>
              {formatNumber(net?.total ?? 0)} personnes · {net?.left ?? 0} G / {net?.right ?? 0} D
            </dd>
            <dt>Parrainés directs</dt>
            <dd>{net?.sponsored ?? 0}</dd>
            <dt>{t.stats.generations}</dt>
            <dd>
              {gens?.currentGeneration ?? 1} / {rules.generationLimit}
            </dd>
          </dl>
        </section>
      </div>

      <ProfileForm
        initial={{
          fullName: me.fullName,
          city: me.city ?? "",
          avatarUrl: me.avatarUrl ?? "",
          phone: me.phone,
          email: me.email ?? "",
        }}
      />
    </div>
  );
}
