import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { calculateMemberAwards, gradeOf } from "@/lib/services/awards";
import { personalPv } from "@/lib/services/binary";
import { getGenerationStats, networkSummary } from "@/lib/services/network";
import { getWallet } from "@/lib/services/wallet";
import { getRules } from "@/lib/services/rules";
import { t } from "@/i18n/fr";
import { formatFcfa, formatNumber, formatPv } from "@/lib/format";
import { AWARD_BY_ID } from "@/lib/plan";
import { Avatar } from "@/components/portal/AppShell";
import { AwardCard } from "@/components/portal/AwardCard";
import { Icon, type IconName } from "@/components/portal/Icon";
import { PackageBadge, ui } from "@/components/portal/ui";
import s from "./awards.module.css";

export const metadata: Metadata = { title: "Mes Awards" };
export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const me = await currentMember();
  if (!me) redirect("/login");
  const [result, pv, gens, net, wallet, rules] = await Promise.all([
    calculateMemberAwards(me.memberCode),
    personalPv(me.memberCode),
    getGenerationStats(me.memberCode),
    networkSummary(me.memberCode),
    getWallet(me.memberCode),
    getRules(),
  ]);
  const awards = result?.awards ?? [];
  const grade = gradeOf(awards);
  const unlocked = awards.filter((a) => a.status === "unlocked").length;

  const tiles: { href: string; icon: IconName; label: string; value: string }[] = [
    { href: "/dashboard/reseau", icon: "users", label: t.nav.network, value: `${formatNumber(net?.total ?? 0)} personnes` },
    { href: "/dashboard/awards", icon: "trophy", label: t.stats.grade, value: grade ? AWARD_BY_ID[grade].nameFr : t.stats.noGrade },
    { href: "/dashboard/bonus", icon: "pv", label: t.stats.personalPv, value: formatPv(pv) },
    { href: "/dashboard/reseau#generations", icon: "layers", label: t.stats.generations, value: `${gens?.currentGeneration ?? 1} / ${rules.generationLimit}` },
    { href: "/marketplace", icon: "store", label: t.nav.marketplace, value: "Boutique" },
    { href: "/dashboard/awards", icon: "star", label: t.nav.awards, value: `${unlocked} / ${awards.length}` },
    { href: "/dashboard/bonus", icon: "gift", label: t.nav.bonus, value: formatFcfa(wallet.lifetime) },
    { href: "/dashboard/paiements", icon: "wallet", label: t.nav.payments, value: formatFcfa(wallet.available) },
    { href: "/dashboard/profil", icon: "user", label: t.nav.profile, value: me.memberCode },
  ];

  return (
    <div className={ui.page}>
      <section className={s.profile}>
        <Avatar member={{ fullName: me.fullName, avatarUrl: me.avatarUrl ?? null }} size={64} />
        <div className={s.who}>
          <h1>{me.fullName}</h1>
          <div className={s.meta}>
            <PackageBadge id={me.packageId} />
            <span className={s.grade}>
              <Icon name="trophy" size={14} /> {grade ? AWARD_BY_ID[grade].nameFr : t.stats.noGrade}
            </span>
          </div>
        </div>
        <dl className={s.figures}>
          <div>
            <dt>{t.stats.personalPv}</dt>
            <dd>{formatPv(pv)}</dd>
          </div>
          <div>
            <dt>PV de groupe</dt>
            <dd>{formatPv(result?.inputs.groupPv ?? 0)}</dd>
          </div>
          <div>
            <dt>{t.stats.generations}</dt>
            <dd>
              {gens?.currentGeneration ?? 1} / {rules.generationLimit}
            </dd>
          </div>
        </dl>
      </section>

      <div className={s.tiles}>
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className={s.tile}>
            <Icon name={tile.icon} size={20} />
            <span>{tile.label}</span>
            <strong>{tile.value}</strong>
          </Link>
        ))}
      </div>

      <section>
        <h2 className={ui.sectionTitle}>{t.awards.title}</h2>
        <div className={s.grid}>
          {awards.map((a) => (
            <AwardCard key={a.award} result={a} generationLimit={rules.generationLimit} />
          ))}
        </div>
        <p className={ui.pageSub}>
          Les PV cumulés comprennent vos PV personnels et le volume de votre réseau jusqu&apos;à la{" "}
          {rules.generationLimit}e génération. Seuls les membres actifs comptent. Un Award débloqué est
          définitif ; l&apos;équipe DHI vous contacte pour la remise de la récompense.
        </p>
      </section>
    </div>
  );
}
