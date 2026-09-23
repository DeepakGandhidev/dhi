import Link from "next/link";
import { t } from "@/i18n/fr";
import { formatRatio } from "@/lib/format";
import { PACKAGE_BY_ID, type PackageId } from "@/lib/plan";
import { Icon, type IconName } from "./Icon";
import s from "./ui.module.css";

export { s as ui };

type Tone = "green" | "gold" | "blue" | "purple" | "navy";

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "green",
  href,
}: {
  icon: IconName;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const inner = (
    <>
      <span className={s.statIcon} data-tone={tone}>
        <Icon name={icon} size={20} />
      </span>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
      {hint ? <span className={s.statHint}>{hint}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className={`${s.card} ${s.stat}`}>
      {inner}
    </Link>
  ) : (
    <div className={`${s.card} ${s.stat}`}>{inner}</div>
  );
}

export function ProgressBar({
  label,
  value,
  ratio,
  tone = "green",
}: {
  label?: React.ReactNode;
  value?: React.ReactNode;
  ratio: number;
  tone?: "green" | "gold" | "purple" | "blue";
}) {
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <div className={s.progress}>
      {label || value ? (
        <div className={s.progressHead}>
          <span className={s.progressLabel}>{label}</span>
          <span className={s.progressValue}>{value ?? formatRatio(pct)}</span>
        </div>
      ) : null}
      <div
        className={s.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        aria-label={typeof label === "string" ? label : undefined}
      >
        <div className={s.fill} data-tone={tone} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, "green" | "gold" | "red" | "blue" | "purple" | undefined> = {
  active: "green",
  approved: "green",
  paid: "green",
  delivered: "green",
  unlocked: "green",
  confirmed: "blue",
  processing: "blue",
  shipped: "blue",
  eligible: "blue",
  pending: "gold",
  in_progress: "gold",
  to_deliver: "gold",
  failed: "red",
  cancelled: "red",
  reversed: "red",
  refunded: "red",
  suspended: "red",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={s.pill} data-tone={STATUS_TONE[status]}>
      {label ?? t.status[status] ?? status}
    </span>
  );
}

export function Pill({ children, tone }: { children: React.ReactNode; tone?: "green" | "gold" | "red" | "blue" | "purple" }) {
  return (
    <span className={s.pill} data-tone={tone}>
      {children}
    </span>
  );
}

export function PackageBadge({ id }: { id: string }) {
  const pkg = PACKAGE_BY_ID[id as PackageId];
  return (
    <span className={s.pkg} data-pkg={id}>
      <span className={s.pkgDot} aria-hidden="true" />
      {pkg?.name ?? id}
    </span>
  );
}

export function GenerationBadge({ generation }: { generation: number }) {
  return <Pill tone="blue">G{generation}</Pill>;
}

export function EmptyState({ icon = "info", children, action }: { icon?: IconName; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Icon name={icon} size={22} />
      </span>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Notice({
  title,
  children,
  tone,
  icon = "info",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "gold" | "red" | "green";
  icon?: IconName;
}) {
  return (
    <div className={s.notice} data-tone={tone} role={tone === "red" ? "alert" : "status"}>
      <Icon name={icon} size={20} />
      <div>
        {title ? <strong>{title}</strong> : null}
        <p>{children}</p>
      </div>
    </div>
  );
}

/** Link-based pagination: works without JavaScript and keeps other filters. */
export function Pager({
  page,
  total,
  perPage,
  href,
}: {
  page: number;
  total: number;
  perPage: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav className={s.pager} aria-label="Pagination">
      {page > 1 ? (
        <Link className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} href={href(page - 1)}>
          <Icon name="chevronLeft" size={16} /> Précédent
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} sur {pages}
      </span>
      {page < pages ? (
        <Link className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} href={href(page + 1)}>
          Suivant <Icon name="chevronRight" size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function PageHead({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={s.pageHead}>
      <div>
        <h1 className={s.pageTitle}>{title}</h1>
        {sub ? <p className={s.pageSub}>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
