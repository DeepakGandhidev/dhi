/**
 * Display formatting for the portal. Amounts are always whole FCFA and every
 * screen formats them through here, so the site never shows two styles.
 */
export { formatFcfa } from "./plan";

// One decimal so half-PV (1,5 PV) shows; whole numbers still print without one.
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const space = (s: string) => s.replace(/[  ]/g, " ");

export const formatNumber = (n: number) => space(nf.format(n));

export const formatPv = (pv: number) => `${formatNumber(pv)} PV`;

/** Signed amount for ledgers: +12 500 FCFA / −5 000 FCFA. */
export const formatSignedFcfa = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatNumber(Math.abs(n))} FCFA`;

/** 2250 bps → "22,5 %". */
export const formatBps = (bps: number) =>
  `${space((bps / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }))} %`;

export const formatRatio = (r: number) =>
  `${space((r * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }))} %`;

export const formatDate = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const formatDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
