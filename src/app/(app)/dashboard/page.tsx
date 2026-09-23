import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { getDashboard } from "@/lib/services/dashboard";
import { siteOrigin, referralLink } from "@/lib/origin";
import { t } from "@/i18n/fr";
import { formatBps, formatDate, formatFcfa, formatNumber, formatPv, formatSignedFcfa } from "@/lib/format";
import { AWARD_BY_ID } from "@/lib/plan";
import { Icon } from "@/components/portal/Icon";
import { LegsCard } from "@/components/portal/LegsCard";
import { CopyButton, ShareButtons } from "@/components/portal/Share";
import { Notice, PackageBadge, ProgressBar, StatCard, StatusPill, ui } from "@/components/portal/ui";
import s from "./home.module.css";

export const metadata: Metadata = { title: "Accueil" };
export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const me = await currentMember();
  if (!me) redirect("/login");
  const [d, origin] = await Promise.all([getDashboard(me.memberCode), siteOrigin()]);
  if (!d) redirect("/login");

  const invite = referralLink(origin, d.member.memberCode);
  const nextAward = d.awards.find((a) => a.status !== "unlocked") ?? null;
  const gradeName = d.grade ? AWARD_BY_ID[d.grade].nameFr : t.stats.noGrade;
  const earned = d.wallet.lifetime;

  return (
    <div className={ui.page}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.heroText}>
          <p className={s.hello}>Bonjour {d.member.firstName}</p>
          <h1 className={s.heroTitle}>
            {t.hero.title[0]}
            <br />
            <span>{t.hero.title[1]}</span>
          </h1>
          <p className={s.heroBody}>{t.hero.body}</p>
          <div className={s.heroCtas}>
            <Link href={`/join?ref=${d.member.memberCode}`} className={`${ui.btn} ${ui.btnGold}`}>
              {t.hero.join}
            </Link>
            <Link href="/plan" className={`${ui.btn} ${s.heroGhost}`}>
              {t.hero.how}
            </Link>
          </div>
        </div>
        <div className={s.codeCard}>
          <span className={s.codeLabel}>{t.stats.memberCode}</span>
          <span className={`${s.codeValue} num`}>{d.member.memberCode}</span>
          <div className={s.codeMeta}>
            <PackageBadge id={d.package.id} />
            <StatusPill status={d.member.status} />
          </div>
          <CopyButton text={d.member.memberCode} label="Copier le code" small />
        </div>
      </section>

      {d.member.status === "pending" ? (
        <Notice title="Votre pack attend la confirmation du paiement" tone="gold" icon="info">
          Pack {d.package.name} — {formatFcfa(d.package.amount)}
          {d.packageOrder ? ` · commande ${d.packageOrder.number}` : ""}. Dès que DHI confirme votre
          paiement, vos {d.package.pv} PV sont crédités et vos bonus deviennent actifs. Les bonus
          gagnés d&apos;ici là sont conservés en attente.
        </Notice>
      ) : null}

      {/* Headline figures */}
      <div className={ui.grid4}>
        <StatCard icon="pv" label={t.stats.personalPv} value={formatPv(d.personalPv)} hint={`PV de groupe : ${formatNumber(d.groupPv)}`} />
        <StatCard icon="users" label={t.stats.network} value={formatNumber(d.network?.total ?? 0)} hint={`${d.network?.active ?? 0} actifs`} tone="blue" href="/dashboard/reseau" />
        <StatCard icon="user" label={t.stats.sponsored} value={formatNumber(d.network?.sponsored ?? 0)} hint={`${d.network?.sponsoredActive ?? 0} actifs`} tone="navy" href="/dashboard/reseau#parraines" />
        <StatCard
          icon="layers"
          label={t.stats.generations}
          value={t.stats.generationOf(d.generations?.currentGeneration ?? 1, d.rules.generationLimit)}
          hint={`${formatNumber(d.generations?.withinLimit ?? 0)} / ${formatNumber(d.generations?.capacity ?? 0)} places`}
          tone="purple"
          href="/dashboard/reseau#generations"
        />
      </div>

      <div className={ui.split}>
        <div className={ui.page}>
          <LegsCard binary={d.binary} rateBps={d.package.binaryBps} pairPv={d.rules.pairPv} pvValue={d.rules.pvValue} active={d.member.status === "active"} />

          {/* Awards progress */}
          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>
              Progression Awards
              <Link href="/dashboard/awards" className={ui.sectionLink}>
                Tout voir
              </Link>
            </h2>
            <div className={s.gradeRow}>
              <span className={s.gradeIcon}>
                <Icon name="trophy" size={22} />
              </span>
              <div>
                <span className={ui.statLabel}>{t.stats.grade}</span>
                <strong className={s.gradeName}>{gradeName}</strong>
              </div>
            </div>
            {nextAward ? (
              <div className={ui.formGrid} style={{ marginTop: 14 }}>
                <p className={ui.statLabel} style={{ margin: 0 }}>
                  Prochain : {AWARD_BY_ID[nextAward.award].nameFr} — {nextAward.reward.join(", ")}
                </p>
                {nextAward.requirements.map((r) =>
                  r.kind === "package" ? (
                    <p key="pkg" className={ui.rowMeta} style={{ margin: 0 }}>
                      <Icon name={r.met ? "check" : "lock"} size={14} />
                      {r.met ? t.awards.packageHeld(r.required) : t.awards.packageMissing(r.required)}
                    </p>
                  ) : (
                    <ProgressBar
                      key={r.kind}
                      label={r.kind === "network" ? "Réseau actif" : r.kind === "pv" ? t.awards.pv : t.awards.sponsored(AWARD_BY_ID[r.award].nameFr)}
                      value={`${formatNumber(r.current)} / ${formatNumber(r.required)}`}
                      ratio={r.ratio}
                      tone={nextAward.award === "sapphire" ? "purple" : "gold"}
                    />
                  )
                )}
              </div>
            ) : (
              <p className={ui.pageSub}>Tous les Awards sont débloqués. Félicitations !</p>
            )}
          </section>
        </div>

        <div className={ui.page}>
          {/* Wallet */}
          <section className={`${ui.card} ${ui.cardDark}`}>
            <h2 className={ui.sectionTitle}>
              Mon portefeuille
              <Link href="/dashboard/paiements" className={ui.sectionLink} style={{ color: "var(--gold)" }}>
                {t.nav.payments}
              </Link>
            </h2>
            <span className={ui.statLabel}>{t.stats.available}</span>
            <div className={s.balance}>{formatFcfa(d.wallet.available)}</div>
            <dl className={ui.kv} style={{ marginTop: 14 }}>
              <dt>{t.stats.pending}</dt>
              <dd>{formatFcfa(d.wallet.pending + d.wallet.locked)}</dd>
              <dt>{t.stats.earned}</dt>
              <dd>{formatFcfa(earned)}</dd>
              <dt>{t.stats.withdrawn}</dt>
              <dd>{formatFcfa(d.wallet.withdrawn)}</dd>
            </dl>
          </section>

          {/* Rates */}
          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>Mon pack {d.package.name}</h2>
            <dl className={ui.kv}>
              <dt>Parrainage direct</dt>
              <dd>{formatBps(d.package.directBps)}</dd>
              <dt>Bonus binaire</dt>
              <dd>{formatBps(d.package.binaryBps)} par paire</dd>
              <dt>Remise achats personnels</dt>
              <dd>{formatBps(d.package.discountBps)}</dd>
              <dt>Valeur du PV</dt>
              <dd>1 PV = {formatFcfa(d.rules.pvValue)}</dd>
            </dl>
          </section>

          {/* Invite */}
          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>Parrainez</h2>
            <p className={ui.pageSub} style={{ marginTop: 0, marginBottom: 12 }}>
              Toute personne inscrite avec ce lien vous est attribuée. Vous gagnez{" "}
              {formatBps(d.package.directBps)} de la valeur PV de son pack.
            </p>
            <ShareButtons url={invite} message="Rejoignez-moi chez DHI International :" />
          </section>
        </div>
      </div>

      {/* Recent activity */}
      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>
          Activité récente
          <Link href="/dashboard/bonus" className={ui.sectionLink}>
            Tous les bonus
          </Link>
        </h2>
        {d.recent.length === 0 ? (
          <p className={ui.pageSub}>{t.empty.bonuses}</p>
        ) : (
          <div className={ui.list}>
            {d.recent.map((b) => (
              <div className={ui.row} key={String(b._id)}>
                <div>
                  <div className={ui.rowTitle}>{t.bonusTypes[b.type]}</div>
                  <div className={ui.rowMeta}>
                    <span>{b.description}</span>
                    <span>{formatDate(b.createdAt)}</span>
                    <StatusPill status={b.status} />
                  </div>
                </div>
                <div className={`${ui.rowAmount} ${b.status === "reversed" ? ui.neg : ui.pos}`}>
                  {formatSignedFcfa(b.status === "reversed" ? -b.amount : b.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
