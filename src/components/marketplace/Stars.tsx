import { t } from "@/i18n/fr";
import s from "./marketplace.module.css";

/** Average rating as five stars filled to the tenth, with the review count. */
export function Stars({ value, count }: { value: number; count: number }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span className={s.stars} aria-label={`${value.toLocaleString("fr-FR")} sur 5, ${t.marketplace.reviews(count)}`}>
      <span className={s.starsTrack} aria-hidden="true">
        ★★★★★
        <span className={s.starsFill} style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
      <span className={s.starsText}>
        {value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} · {t.marketplace.reviews(count)}
      </span>
    </span>
  );
}
