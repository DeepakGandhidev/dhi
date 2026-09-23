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
  direct: number; // direct sponsorship bonus, display only; money uses the *Bps fields
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

/**
 * Generations are counted with the member as generation 1, so eight
 * generations is the member plus seven levels below: 2 + 4 + ... + 128 = 254
 * people, 255 positions in all. The binary bonus stops at generation 8.
 */
export const GENERATION_LIMIT = 8;
/** Levels below the member that still feed their binary legs. */
export const BINARY_DEPTH = GENERATION_LIMIT - 1;

/** Generations 2-8: the levels below you, each double the one above. */
export const GENERATIONS = Array.from({ length: BINARY_DEPTH }, (_, i) => ({
  level: i + 2,
  people: 2 ** (i + 1),
}));

export const NETWORK_BELOW = GENERATIONS.reduce((n, g) => n + g.people, 0); // 254
export const NETWORK_TOTAL = NETWORK_BELOW + 1; // 255 positions including you

/** Package ladder, weakest first. Awards ask for "at least" a package. */
export const PACKAGE_RANK: Record<PackageId, number> = {
  little: 1,
  index: 2,
  ring: 3,
  middle: 4,
  thumb: 5,
};

export type AwardId = "star" | "emerald" | "diamond" | "sapphire";

export type AwardRule = {
  id: AwardId;
  name: string;
  /** French display name, as used in the member portal. */
  nameFr: string;
  stone: string;
  /** Lowest package that qualifies; null means any package. */
  minPackage: PackageId | null;
  /** Active people required within the generation limit. */
  networkPeople: number;
  /** Personally sponsored members who must already hold this award. */
  sponsoredWith: { award: AwardId; count: number } | null;
  /** Group volume: own PV plus downline PV within the generation limit. */
  groupPv: number;
  reward: string[];
  requirement: string;
  detail: string;
};

export const AWARDS: AwardRule[] = [
  {
    id: "star",
    name: "Star",
    nameFr: "Star",
    stone: "#FFB627",
    minPackage: null,
    networkPeople: NETWORK_BELOW,
    sponsoredWith: null,
    groupPv: 0,
    reward: ["1 ordinateur portable", "100 000 FCFA", "Des produits"],
    requirement: "Reach the 8th generation",
    detail: `${NETWORK_BELOW} active people below you, on any package. Reward: a laptop, 100 000 FCFA and products.`,
  },
  {
    id: "emerald",
    name: "Emerald",
    nameFr: "Émeraude",
    stone: "#12907A",
    minPackage: "ring",
    networkPeople: 0,
    sponsoredWith: { award: "star", count: 1 },
    groupPv: 15_000,
    reward: ["Une moto"],
    requirement: "Hold Ring, sponsor 1 Star, accumulate 15 000 PV",
    detail: "Ring package or above, one personally sponsored member at Star, and 15 000 PV. Reward: a motorcycle.",
  },
  {
    id: "diamond",
    name: "Diamond",
    nameFr: "Diamond",
    stone: "#8FA3D9",
    minPackage: "middle",
    networkPeople: 0,
    sponsoredWith: { award: "emerald", count: 2 },
    groupPv: 30_000,
    reward: ["Une voiture"],
    requirement: "Hold Middle, sponsor 2 Emeralds, accumulate 30 000 PV",
    detail: "Middle package or above, two personally sponsored members at Emerald, and 30 000 PV. Reward: a car.",
  },
  {
    id: "sapphire",
    name: "Sapphire",
    nameFr: "Sapphir",
    stone: "#7B4FD6",
    minPackage: "thumb",
    networkPeople: 0,
    sponsoredWith: { award: "diamond", count: 4 },
    groupPv: 65_000,
    reward: ["Une maison"],
    requirement: "Hold Thumb, sponsor 4 Diamonds, accumulate 65 000 PV",
    detail: "Thumb package, four personally sponsored members at Diamond, and 65 000 PV. Reward: a house.",
  },
];

export const AWARD_BY_ID = Object.fromEntries(AWARDS.map((a) => [a.id, a])) as Record<
  AwardId,
  AwardRule
>;

/** Marketplace affiliate commission, in basis points of the sale (800 = 8%). */
export const AFFILIATE_BPS = 800;

/**
 * Fast Cumulation: unlocked once the structure is complete through the 8th
 * generation. The payout is not published; it stays 0 (qualification is
 * still recorded) until DHI sets it in the admin configuration.
 */
export const FAST_CUMULATION = { people: NETWORK_BELOW, amount: 0 };

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
