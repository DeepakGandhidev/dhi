import { t } from "@/i18n/fr";
import { formatDate, formatNumber } from "@/lib/format";
import { AWARD_BY_ID, PACKAGE_BY_ID } from "@/lib/plan";
import type { AwardResult } from "@/lib/services/awards";
import { Icon } from "./Icon";
import { ProgressBar, StatusPill } from "./ui";
import s from "./AwardCard.module.css";

const TONE = { star: "gold", emerald: "green", diamond: "blue", sapphire: "purple" } as const;

/** One award: its gem, state, each requirement with its own bar, and the reward. */
export function AwardCard({ result, generationLimit }: { result: AwardResult; generationLimit: number }) {
  const rule = AWARD_BY_ID[result.award];
  const unlocked = result.status === "unlocked";
  const tone = TONE[result.award];

  return (
    <article className={s.card} data-award={result.award} data-unlocked={unlocked}>
      <header className={s.head}>
        <Gem color={rule.stone} unlocked={unlocked} />
        <div className={s.title}>
          <h3>{rule.nameFr.toUpperCase()}</h3>
          <StatusPill status={result.status} />
        </div>
        <span className={s.lock} aria-label={unlocked ? "Débloqué" : "Verrouillé"}>
          <Icon name={unlocked ? "unlock" : "lock"} size={18} />
        </span>
      </header>

      <p className={s.pkgLine}>
        {t.awards.requiredPackage} :{" "}
        <strong>{rule.minPackage ? PACKAGE_BY_ID[rule.minPackage].name : t.awards.anyPackage}</strong>
      </p>

      <div className={s.section}>
        <span className={s.label}>{t.awards.conditions}</span>
        <ul className={s.reqs}>
          {result.requirements.map((r) => (
            <li key={r.kind} data-met={r.met}>
              {r.kind === "package" ? (
                <span className={s.check}>
                  <Icon name={r.met ? "check" : "close"} size={14} />
                  {r.met ? t.awards.packageHeld(PACKAGE_BY_ID[r.required].name) : t.awards.packageMissing(PACKAGE_BY_ID[r.required].name)}
                </span>
              ) : (
                <ProgressBar
                  tone={tone === "green" ? "green" : tone}
                  label={
                    r.kind === "network"
                      ? `Atteindre la ${generationLimit}e génération`
                      : r.kind === "pv"
                        ? t.awards.pv
                        : `Parrainer ${r.required} ${AWARD_BY_ID[r.award].nameFr}`
                  }
                  value={
                    r.kind === "network"
                      ? t.awards.network(r.current, r.required)
                      : `${formatNumber(r.current)} / ${formatNumber(r.required)}${r.kind === "pv" ? " PV" : ""}`
                  }
                  ratio={r.ratio}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className={s.reward}>
        <Icon name="gift" size={18} />
        <div>
          <span className={s.label}>{t.awards.reward}</span>
          <strong>{result.reward.join(" + ")}</strong>
        </div>
      </div>

      {unlocked ? (
        <p className={s.foot}>Débloqué le {formatDate(result.unlockedAt)}</p>
      ) : result.missingRequirements.length ? (
        <div className={s.foot}>
          <span className={s.label}>{t.awards.missing}</span>
          <ul>
            {result.missingRequirements.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function Gem({ color, unlocked }: { color: string; unlocked: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" style={{ opacity: unlocked ? 1 : 0.55, flex: "none" }}>
      <polygon points="24,4 42,17 35,42 13,42 6,17" fill={color} />
      <polygon points="24,4 35,42 24,24" fill="rgba(255,255,255,.25)" />
      <polygon points="24,4 13,42 24,24" fill="rgba(0,0,0,.14)" />
      <polygon points="6,17 42,17 24,24" fill="rgba(255,255,255,.18)" />
    </svg>
  );
}
