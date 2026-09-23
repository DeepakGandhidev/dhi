import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { Member } from "@/lib/models";
import { getBinaryState, personalPv } from "@/lib/services/binary";
import { getGenerationStats, listGeneration, networkSummary, personalPvFor } from "@/lib/services/network";
import { referralLink, siteOrigin } from "@/lib/origin";
import { t } from "@/i18n/fr";
import { formatDate, formatNumber, formatPv } from "@/lib/format";
import { NetworkTree, type TreeNode } from "@/components/portal/NetworkTree";
import { LinkField, ShareButtons } from "@/components/portal/Share";
import { EmptyState, GenerationBadge, PackageBadge, PageHead, Pager, ProgressBar, StatCard, StatusPill, ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Mon réseau" };
export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | undefined>>;

export default async function NetworkPage({ searchParams }: { searchParams: Search }) {
  const me = await currentMember();
  if (!me) redirect("/login");
  const sp = await searchParams;
  const gen = Number(sp.gen) || 0;
  const leg = sp.leg === "left" || sp.leg === "right" ? sp.leg : undefined;
  const status = sp.status === "active" || sp.status === "pending" ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const rpage = Math.max(1, Number(sp.rpage) || 1);

  const [summary, stats, binary, ownPv, origin, hasLeft, hasRight, sponsored, sponsoredTotal, sponsor, genList] =
    await Promise.all([
      networkSummary(me.memberCode),
      getGenerationStats(me.memberCode),
      getBinaryState(me.memberCode),
      personalPv(me.memberCode),
      siteOrigin(),
      Member.exists({ placementParent: me.memberCode, position: "left" }),
      Member.exists({ placementParent: me.memberCode, position: "right" }),
      Member.find({ sponsorCode: me.memberCode })
        .sort({ createdAt: -1 })
        .skip((rpage - 1) * 10)
        .limit(10)
        .select("memberCode fullName packageId status position placementParent createdAt")
        .lean(),
      Member.countDocuments({ sponsorCode: me.memberCode }),
      me.sponsorCode ? Member.findOne({ memberCode: me.sponsorCode }).select("fullName memberCode").lean() : null,
      gen >= 2 ? listGeneration(me.memberCode, gen, { page, perPage: 20, leg, status }) : null,
    ]);
  const sponsoredPv = await personalPvFor(sponsored.map((r) => r.memberCode));

  const root: TreeNode = {
    memberCode: me.memberCode,
    fullName: me.fullName,
    packageId: me.packageId,
    position: null,
    generation: 1,
    status: me.status,
    sponsorCode: me.sponsorCode ?? null,
    createdAt: new Date(me.createdAt).toISOString(),
    personalPv: ownPv,
    hasLeft: Boolean(hasLeft),
    hasRight: Boolean(hasRight),
  };
  const invite = referralLink(origin, me.memberCode);
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const all = { gen: gen || undefined, leg, status, page, rpage, ...over };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "" && !(k.endsWith("page") && v === 1)) p.set(k, String(v));
    return `/dashboard/reseau?${p.toString()}`;
  };

  return (
    <div className={ui.page}>
      <PageHead
        title={t.nav.network}
        sub={
          sponsor
            ? `Parrainé par ${sponsor.fullName} (${sponsor.memberCode})${me.placementParent && me.placementParent !== me.sponsorCode ? ` · placé sous ${me.placementParent}` : ""}`
            : "Vous êtes à la racine du réseau."
        }
      />

      <div className={ui.grid4}>
        <StatCard icon="users" label="Personnes dans le réseau" value={formatNumber(summary?.total ?? 0)} hint={`${summary?.active ?? 0} actives · ${(summary?.total ?? 0) - (summary?.active ?? 0)} en attente`} tone="blue" />
        <StatCard icon="user" label={t.stats.sponsored} value={formatNumber(summary?.sponsored ?? 0)} hint={`${summary?.sponsoredActive ?? 0} actifs`} tone="navy" />
        <StatCard icon="network" label="Branche gauche" value={formatNumber(summary?.left ?? 0)} hint={`${formatPv(binary.totalLeft)} cumulés · ${formatPv(binary.carryLeft)} en report`} />
        <StatCard icon="network" label="Branche droite" value={formatNumber(summary?.right ?? 0)} hint={`${formatPv(binary.totalRight)} cumulés · ${formatPv(binary.carryRight)} en report`} tone="blue" />
      </div>

      {/* Tree */}
      <section className={ui.card}>
        <h2 className={ui.sectionTitle}>Arbre binaire</h2>
        {root.hasLeft || root.hasRight ? (
          <NetworkTree root={root} maxGeneration={stats?.generationLimit ?? 8} />
        ) : (
          <EmptyState icon="network">{t.empty.network}</EmptyState>
        )}
      </section>

      {/* Generations */}
      <section className={ui.card} id="generations">
        <h2 className={ui.sectionTitle}>
          {t.stats.generations}
          <span className={ui.pageSub} style={{ margin: 0 }}>
            Génération actuelle : {stats?.currentGeneration ?? 1} / {stats?.generationLimit ?? 8}
          </span>
        </h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Génération</th>
                <th>Remplissage</th>
                <th className={ui.num}>Actifs</th>
                <th className={ui.num}>PV reçus</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <GenerationBadge generation={1} /> Vous
                </td>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  1 / 1
                </td>
              </tr>
              {stats?.generations.map((g) => (
                <tr key={g.generation}>
                  <td>
                    <GenerationBadge generation={g.generation} />
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <ProgressBar ratio={g.memberCount / g.capacity} value={`${g.memberCount} / ${g.capacity}`} label={g.complete ? "Complète" : undefined} />
                  </td>
                  <td className={ui.num}>{g.activeCount}</td>
                  <td className={ui.num}>{formatNumber(g.pv)}</td>
                  <td className={ui.num}>
                    {g.memberCount > 0 ? (
                      <Link className={ui.sectionLink} href={qs({ gen: g.generation, page: 1 })}>
                        Voir
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={ui.pageSub}>
          Le bonus binaire est payé jusqu&apos;à la {stats?.generationLimit ?? 8}e génération, soit{" "}
          {formatNumber(stats?.capacity ?? 254)} personnes sous vous.
          {stats && stats.beyondLimit > 0
            ? ` ${formatNumber(stats.beyondLimit)} personne(s) au-delà font partie de votre réseau mais ne génèrent plus de bonus binaire pour vous.`
            : ""}
        </p>

        {genList ? (
          <div style={{ marginTop: 18 }} id="liste">
            <h3 className={ui.sectionTitle}>
              Génération {gen}
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[undefined, "left", "right"].map((l) => (
                  <Link key={l ?? "all"} className={ui.tab} data-active={leg === l} href={qs({ leg: l, page: 1 })}>
                    {l ? t.legs[l] : "Les deux"}
                  </Link>
                ))}
                {[undefined, "active", "pending"].map((st) => (
                  <Link key={st ?? "any"} className={ui.tab} data-active={status === st} href={qs({ status: st, page: 1 })}>
                    {st ? t.status[st] : "Tous"}
                  </Link>
                ))}
              </span>
            </h3>
            {genList.items.length === 0 ? (
              <EmptyState icon="users">Aucun membre ne correspond à ce filtre.</EmptyState>
            ) : (
              <div className={ui.list}>
                {genList.items.map((m) => (
                  <div key={m.memberCode} className={ui.row}>
                    <div>
                      <div className={ui.rowTitle}>{m.fullName}</div>
                      <div className={ui.rowMeta}>
                        <span className="num">{m.memberCode}</span>
                        <PackageBadge id={m.packageId} />
                        {m.position ? <span>{t.legs[m.position]}</span> : null}
                        <StatusPill status={m.status} />
                      </div>
                    </div>
                    <div className={ui.rowAmount}>{formatPv(m.personalPv)}</div>
                  </div>
                ))}
              </div>
            )}
            <Pager page={page} total={genList.total} perPage={20} href={(p) => qs({ page: p })} />
          </div>
        ) : null}
      </section>

      {/* Referral */}
      <div className={ui.split}>
        <section className={ui.card} id="parraines">
          <h2 className={ui.sectionTitle}>Mes parrainés directs ({sponsoredTotal})</h2>
          {sponsored.length === 0 ? (
            <EmptyState icon="user">Personne n&apos;a encore rejoint DHI avec votre code.</EmptyState>
          ) : (
            <div className={ui.list}>
              {sponsored.map((r) => (
                <div key={r.memberCode} className={ui.row}>
                  <div>
                    <div className={ui.rowTitle}>{r.fullName}</div>
                    <div className={ui.rowMeta}>
                      <span className="num">{r.memberCode}</span>
                      <PackageBadge id={r.packageId} />
                      <StatusPill status={r.status} />
                      <span>{formatDate(r.createdAt)}</span>
                      {r.placementParent !== me.memberCode ? <span>placé sous {r.placementParent}</span> : r.position ? <span>{t.legs[r.position]}</span> : null}
                    </div>
                  </div>
                  <div className={ui.rowAmount}>{formatPv(sponsoredPv.get(r.memberCode) ?? 0)}</div>
                </div>
              ))}
            </div>
          )}
          <Pager page={rpage} total={sponsoredTotal} perPage={10} href={(p) => `${qs({ rpage: p })}#parraines`} />
        </section>

        <section className={ui.card}>
          <h2 className={ui.sectionTitle}>Mon lien de parrainage</h2>
          <p className={ui.pageSub} style={{ marginTop: 0 }}>
            Code : <strong className="num">{me.memberCode}</strong>. Le nouveau membre choisit sa
            branche à l&apos;inscription ; si elle est pleine, il est placé à la première place libre
            en dessous.
          </p>
          <div className={ui.formGrid} style={{ marginTop: 12 }}>
            <LinkField url={invite} />
            <ShareButtons url={invite} message="Rejoignez-moi chez DHI International :" />
          </div>
        </section>
      </div>
    </div>
  );
}
