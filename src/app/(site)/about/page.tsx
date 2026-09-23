import type { Metadata } from "next";
import Link from "next/link";
import { TEAM, type TeamMember } from "@/lib/team";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About us",
  description:
    "L’équipe dirigeante de Divine Health International : direction générale, Afrique, marketing et ressources humaines.",
};

function Portrait({ member, size }: { member: TeamMember; size: "lead" | "row" }) {
  return (
    <div className={`${styles.portrait} ${size === "lead" ? styles.portraitLead : ""}`}>
      <img
        src={member.photo}
        alt={member.name ? `Portrait de ${member.name}` : "Portrait d’un membre de l’équipe DHI"}
        className={styles.portraitImg}
        style={member.focus ? { objectPosition: member.focus } : undefined}
        loading={size === "lead" ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}

function Roles({ roles }: { roles: string[] }) {
  if (!roles.length) return null;
  return (
    <div className={styles.roles}>
      <p className={styles.rolePrimary}>{roles[0]}</p>
      {roles.slice(1).map((r) => (
        <p key={r} className={styles.roleSecondary}>
          {r}
        </p>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const [lead, ...rest] = TEAM;

  return (
    <div lang="fr">
      <section className="section section--tight">
        <div className="shell">
          <p className={styles.eyebrow}>À propos</p>
          <h1 className={styles.title}>Notre équipe</h1>
          <p className="lede">
            Les femmes et les hommes qui dirigent Divine Health International, en Afrique et
            au-delà.
          </p>
        </div>
      </section>

      {/* The CEO gets the full width */}
      <section className="section section--tight dark">
        <div className="shell">
          <article className={styles.lead} id={lead.id}>
            <Portrait member={lead} size="lead" />
            <div>
              <h2 className={styles.leadName}>{lead.name}</h2>
              <Roles roles={lead.roles} />
              {lead.tagline && (
                <p className={styles.tagline}>
                  {lead.tagline.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
              )}
              {lead.intro?.map((p) => (
                <p key={p} className={styles.leadBody}>
                  {p}
                </p>
              ))}
              {lead.quote && <blockquote className={styles.quote}>“{lead.quote}”</blockquote>}
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className={styles.list}>
            {rest.map((m) => (
              <article key={m.id} id={m.id} className={styles.member}>
                <div className={styles.memberAside}>
                  <Portrait member={m} size="row" />
                </div>

                <div>
                  {m.name ? (
                    <h2 className={styles.name}>{m.name}</h2>
                  ) : (
                    <p className={styles.pending}>Profil à venir</p>
                  )}
                  <Roles roles={m.roles} />

                  {m.points && (
                    <dl className={styles.points}>
                      {m.points.map((pt) => (
                        <div
                          key={pt.label}
                          className={`${styles.point} ${pt.tags ? styles.pointWide : ""}`}
                        >
                          <dt className={styles.pointLabel}>{pt.label}</dt>
                          <dd className={styles.pointText}>
                            {pt.tags ? (
                              <ul className={styles.tags}>
                                {pt.tags.map((t) => (
                                  <li key={t} className={styles.tag}>
                                    {t}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              pt.text
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {m.quote && <blockquote className={styles.quote}>“{m.quote}”</blockquote>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" style={{ background: "var(--paper-deep)" }}>
        <div className="shell">
          <h2 className={styles.closeTitle}>Rejoignez l’équipe DHI</h2>
          <p className="lede">
            Une communauté construite autour de la santé, du bien-être et de l’opportunité.
          </p>
          <Link href="/join" className="btn btn--ink">
            Join DHI
          </Link>
        </div>
      </section>
    </div>
  );
}
