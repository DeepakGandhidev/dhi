/**
 * The DHI compensation plan, in one place.
 * Every rate shown on the site is read from here, so the plan can never
 * disagree with itself across pages.
 */

export const PV_VALUE = 500; // 1 PV = 500 FCFA
export const PAIR_PV = 25; // a binary pair is 25 PV on each side
export const CURRENCY = "FCFA";

export type PackageId = "little" | "index" | "ring" | "middle" | "thumb";

export type Package = {
  id: PackageId;
  name: string;
  finger: string;
  products: number;
  pv: number;
  amount: number;
  direct: number; // direct sponsorship bonus
  binary: number; // bonus per 25 PV pair
  discount: number; // discount on personal purchases
  blurb: string;
  height: number; // relative finger height in the hero, 0-1
};

export const PACKAGES: Package[] = [
  {
    id: "little",
    name: "Little",
    finger: "Little finger",
    products: 1,
    pv: 25,
    amount: 25_600,
    direct: 0.25,
    binary: 0.1,
    discount: 0.1,
    blurb: "One product, one position. The smallest way to hold a place in the network.",
    height: 0.58,
  },
  {
    id: "index",
    name: "Index",
    finger: "Index finger",
    products: 3,
    pv: 75,
    amount: 76_800,
    direct: 0.3,
    binary: 0.15,
    discount: 0.15,
    blurb: "Three products. Enough stock to sell while you sponsor your first two people.",
    height: 0.84,
  },
  {
    id: "ring",
    name: "Ring",
    finger: "Ring finger",
    products: 5,
    pv: 125,
    amount: 128_000,
    direct: 0.35,
    binary: 0.2,
    discount: 0.2,
    blurb: "Five products and a fifth of every pair. The package most members settle on.",
    height: 0.92,
  },
  {
    id: "middle",
    name: "Middle",
    finger: "Middle finger",
    products: 16,
    pv: 400,
    amount: 409_600,
    direct: 0.4,
    binary: 0.225,
    discount: 0.225,
    blurb: "Sixteen products. Stock for a shop counter, and 40% on everyone you sponsor.",
    height: 1,
  },
  {
    id: "thumb",
    name: "Thumb",
    finger: "Thumb",
    products: 64,
    pv: 1_000,
    amount: 1_000_000,
    direct: 0.5,
    binary: 0.25,
    discount: 0.25,
    blurb: "Sixty-four products and every rate at its ceiling. Half of each direct sponsorship.",
    height: 0.66,
  },
];

export const PACKAGE_BY_ID = Object.fromEntries(
  PACKAGES.map((p) => [p.id, p])
) as Record<PackageId, Package>;

/** Generations 1-5: the depth the binary bonus is paid to. */
export const GENERATIONS = [
  { level: 1, people: 2 },
  { level: 2, people: 4 },
  { level: 3, people: 8 },
  { level: 4, people: 16 },
  { level: 5, people: 32 },
];

export const NETWORK_BELOW = GENERATIONS.reduce((n, g) => n + g.people, 0); // 62
export const NETWORK_TOTAL = NETWORK_BELOW + 1; // 63 positions including you

export const AWARDS = [
  {
    name: "Star",
    stone: "#FFB627",
    requirement: "Complete your first generation on both legs",
    detail: "Two directly sponsored members, one left and one right, both active.",
  },
  {
    name: "Emerald",
    stone: "#12907A",
    requirement: "Fill three generations",
    detail: "14 positions below you, with pairs forming on your weaker leg every cycle.",
  },
  {
    name: "Diamond",
    stone: "#8FA3D9",
    requirement: "Fill four generations",
    detail: "30 positions below you and a leg that keeps its own momentum.",
  },
  {
    name: "Sapphire",
    stone: "#2E3480",
    requirement: "Complete all five generations",
    detail: "62 below you, 63 with you. The Fast Cumulative bonus unlocks here.",
  },
];

/** Money helpers -------------------------------------------------------- */

export const pvToFcfa = (pv: number) => pv * PV_VALUE;

export const formatFcfa = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.round(n))
    .replace(/ | /g, " ") + " " + CURRENCY;

export const formatPct = (n: number) =>
  `${(n * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

/** How many 25-PV pairs the two legs make. The weaker leg decides. */
export function pairsFrom(leftPv: number, rightPv: number) {
  const pairs = Math.floor(Math.min(leftPv, rightPv) / PAIR_PV);
  const matchedPv = pairs * PAIR_PV;
  return {
    pairs,
    matchedPv,
    carryLeft: leftPv - matchedPv,
    carryRight: rightPv - matchedPv,
    weakerLeg: leftPv === rightPv ? "balanced" : leftPv < rightPv ? "left" : "right",
  } as const;
}

/** Binary earnings for a package given both legs. */
export function binaryEarnings(pkg: Package, leftPv: number, rightPv: number) {
  const p = pairsFrom(leftPv, rightPv);
  const perPair = pvToFcfa(PAIR_PV) * pkg.binary; // e.g. 12 500 x 20%
  return { ...p, perPair, total: perPair * p.pairs };
}

/** Direct sponsorship bonus: your rate on the PV value of their package. */
export function directEarnings(sponsor: Package, recruit: Package) {
  const base = pvToFcfa(recruit.pv);
  return { base, rate: sponsor.direct, total: base * sponsor.direct };
}
