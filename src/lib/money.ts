/**
 * Money arithmetic for everything that is paid or charged.
 *
 * FCFA has no subunit, so every amount is a whole number of francs and every
 * rate is an integer number of basis points (2250 = 22.5%). Products of the
 * two stay far below 2^53, so the arithmetic is exact; the only rounding is
 * the single floor at the end, which never pays out more than was earned.
 */

export const BPS = 10_000;

export function assertFcfa(n: number, what = "amount"): number {
  if (!Number.isSafeInteger(n)) throw new Error(`${what} must be a whole number of FCFA, got ${n}`);
  return n;
}

export function assertBps(bps: number): number {
  if (!Number.isInteger(bps) || bps < 0 || bps > BPS) throw new Error(`Invalid rate ${bps} bps`);
  return bps;
}

/** A decimal rate (0.225) as basis points (2250), without float drift. */
export const toBps = (rate: number) => assertBps(Math.round(rate * BPS));

/** `amount × bps / 10 000`, rounded down to the franc. */
export function applyBps(amount: number, bps: number): number {
  assertFcfa(amount);
  assertBps(bps);
  return Math.floor((amount * bps) / BPS);
}

export function pvToFcfaExact(pv: number, pvValue: number): number {
  if (!Number.isSafeInteger(pv)) throw new Error(`PV must be whole, got ${pv}`);
  return assertFcfa(pv * pvValue);
}

export const formatBps = (bps: number) =>
  `${(bps / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
