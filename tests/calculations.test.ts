import { describe, expect, it } from "vitest";
import { applyBps, toBps } from "@/lib/money";
import { binaryBonus, matchLegs } from "@/lib/services/binary";
import { directBonus } from "@/lib/services/direct";
import { priceLine, commissionFor, memberDiscountBps } from "@/lib/services/orders";
import { defaultRules, mergeRules } from "@/lib/services/rules";
import { evaluateAward, type AwardInputs } from "@/lib/services/awards";
import { NETWORK_BELOW, NETWORK_TOTAL, GENERATIONS, PV_VALUE, pvToFcfa } from "@/lib/plan";

const rules = defaultRules();

describe("package rules", () => {
  it("has the published rates for every package", () => {
    const p = rules.packages;
    expect([p.little.directBps, p.index.directBps, p.ring.directBps, p.middle.directBps, p.thumb.directBps]).toEqual([2500, 3000, 3500, 4000, 5000]);
    expect([p.little.binaryBps, p.index.binaryBps, p.ring.binaryBps, p.middle.binaryBps, p.thumb.binaryBps]).toEqual([1000, 1500, 2000, 2250, 2500]);
    expect([p.little.discountBps, p.index.discountBps, p.ring.discountBps, p.middle.discountBps, p.thumb.discountBps]).toEqual([1000, 1500, 2000, 2250, 2500]);
  });

  it("converts decimal rates without float drift", () => {
    expect(toBps(0.225)).toBe(2250);
    expect(toBps(0.1)).toBe(1000);
  });
});

describe("PV", () => {
  it("1 PV = 500 FCFA", () => {
    expect(PV_VALUE).toBe(500);
    expect(pvToFcfa(25)).toBe(12_500);
    expect(pvToFcfa(0)).toBe(0);
  });
});

describe("binary matching", () => {
  it.each([
    [0, 0, 0, 0, 0],
    [25, 0, 0, 25, 0],
    [25, 25, 1, 0, 0],
    [50, 25, 1, 25, 0],
    [100, 75, 3, 25, 0],
    [100, 100, 4, 0, 0],
    [24, 24, 0, 24, 24],
    [49, 60, 1, 24, 35],
  ])("left %i / right %i → %i pairs, carry %i / %i", (l, r, pairs, cl, cr) => {
    const m = matchLegs(l, r, 25);
    expect(m.pairs).toBe(pairs);
    expect(m.matchedPv).toBe(pairs * 25);
    expect(m.carryLeft).toBe(cl);
    expect(m.carryRight).toBe(cr);
  });

  it("pays each package its rate on one 25 PV pair", () => {
    const p = rules.packages;
    expect(binaryBonus(25, 500, p.little.binaryBps)).toBe(1250);
    expect(binaryBonus(25, 500, p.index.binaryBps)).toBe(1875);
    expect(binaryBonus(25, 500, p.ring.binaryBps)).toBe(2500);
    // 12 500 × 22.5% = 2 812.5 — never pays the half franc.
    expect(binaryBonus(25, 500, p.middle.binaryBps)).toBe(2812);
    expect(binaryBonus(25, 500, p.thumb.binaryBps)).toBe(3125);
  });

  it("rounds once on the whole match, not per pair", () => {
    // 2 pairs at 22.5% = 25 000 × 22.5% = 5 625, not 2 × 2 812
    expect(binaryBonus(50, 500, 2250)).toBe(5625);
  });
});

describe("direct sponsorship", () => {
  it("is the sponsor's rate on the recruit's package PV value", () => {
    // Ring sponsor (35%), Index recruit (75 PV = 37 500 FCFA)
    expect(directBonus(75, 500, 3500)).toBe(13_125);
    // Thumb sponsor (50%), Thumb recruit (1 000 PV = 500 000 FCFA)
    expect(directBonus(1000, 500, 5000)).toBe(250_000);
  });
});

describe("generations", () => {
  it("counts 254 people below across 8 generations, 255 with the member", () => {
    expect(GENERATIONS.map((g) => g.people)).toEqual([2, 4, 8, 16, 32, 64, 128]);
    expect(GENERATIONS.at(-1)!.level).toBe(8);
    expect(NETWORK_BELOW).toBe(254);
    expect(NETWORK_TOTAL).toBe(255);
    expect(rules.binaryDepth).toBe(7);
  });
});

describe("personal purchase discount", () => {
  it("100 000 FCFA at 20% is 80 000", () => {
    expect(priceLine(100_000, 1, 2000)).toEqual({ gross: 100_000, discount: 20_000, lineTotal: 80_000 });
  });
  it("applies only to an active member's package", () => {
    expect(memberDiscountBps(null, rules)).toBe(0);
    expect(memberDiscountBps({ memberCode: "DHI-A", packageId: "ring", status: "pending" } as never, rules)).toBe(0);
    expect(memberDiscountBps({ memberCode: "DHI-A", packageId: "middle", status: "active" } as never, rules)).toBe(2250);
  });
  it("floors fractional discounts", () => {
    expect(priceLine(35_001, 1, 2250).discount).toBe(7875);
  });
});

describe("affiliate commission", () => {
  it("8% of 1 250 000 is 100 000", () => {
    expect(commissionFor([{ lineTotal: 1_250_000, affiliateBps: 800 }])).toBe(100_000);
  });
  it("uses each line's own rate on what was paid", () => {
    expect(commissionFor([{ lineTotal: 100_000, affiliateBps: 800 }, { lineTotal: 50_000, affiliateBps: 1000 }])).toBe(13_000);
  });
});

describe("rules overrides", () => {
  it("rejects malformed values", () => {
    expect(() => mergeRules(rules, { affiliateBps: 20_000 })).toThrow();
    expect(() => mergeRules(rules, { pvValue: -1 })).toThrow();
    expect(() => mergeRules(rules, { packages: { ring: { binaryBps: 1.5 } } })).toThrow();
  });
  it("moves the binary depth with the generation limit", () => {
    expect(mergeRules(rules, { generationLimit: 5 }).binaryDepth).toBe(4);
  });
  it("money helpers reject fractional francs", () => {
    expect(() => applyBps(10.5, 100)).toThrow();
  });
});

describe("award evaluation", () => {
  const base: AwardInputs = {
    packageId: "ring",
    active: true,
    activeNetwork: 0,
    groupPv: 0,
    sponsoredWithAward: {},
    unlocked: {},
  };
  const t = (id: string) => rules.awards.find((a) => a.id === id)!;

  it("Star tracks active people against 254", () => {
    const r = evaluateAward(t("star"), { ...base, activeNetwork: 192 });
    expect(r.eligible).toBe(false);
    expect(r.status).toBe("in_progress");
    const req = r.requirements[0];
    expect(req.kind).toBe("network");
    if (req.kind === "network") expect(req.ratio).toBeCloseTo(0.756, 3);
    expect(evaluateAward(t("star"), { ...base, activeNetwork: 254 }).eligible).toBe(true);
  });

  it("Emerald lists each missing requirement separately", () => {
    const r = evaluateAward(t("emerald"), { ...base, groupPv: 12_450 });
    expect(r.requirements.map((x) => [x.kind, x.met])).toEqual([
      ["package", true],
      ["sponsored", false],
      ["pv", false],
    ]);
    expect(r.missingRequirements).toEqual([
      "Parrainer personnellement 1 membre Star",
      "Cumuler 2 550 PV supplémentaires",
    ]);
    const pv = r.requirements[2];
    if (pv.kind === "pv") expect(pv.ratio).toBeCloseTo(0.83, 2);
  });

  it("locks an award whose package is not held", () => {
    const r = evaluateAward(t("sapphire"), { ...base, packageId: "middle", groupPv: 70_000 });
    expect(r.status).toBe("locked");
    expect(r.eligible).toBe(false);
  });

  it("Diamond needs Middle, 2 Emeralds and 30 000 PV — all of them", () => {
    const ok = { ...base, packageId: "middle" as const, groupPv: 30_000, sponsoredWithAward: { emerald: 2 } };
    expect(evaluateAward(t("diamond"), ok).eligible).toBe(true);
    expect(evaluateAward(t("diamond"), { ...ok, groupPv: 29_999 }).eligible).toBe(false);
    expect(evaluateAward(t("diamond"), { ...ok, sponsoredWithAward: { emerald: 1 } }).eligible).toBe(false);
    expect(evaluateAward(t("diamond"), { ...ok, packageId: "thumb" }).eligible).toBe(true);
  });
});

describe("half PV", () => {
  it("accepts steps of 0.5 and keeps sums exact", async () => {
    const { isPv } = await import("@/lib/money");
    expect([0, 1.5, 25, -1.5].every(isPv)).toBe(true);
    expect([0.1, 1.25, NaN, Infinity, "2"].some(isPv)).toBe(false);
    // 17 × 1.5 PV reaches exactly 25.5 — one pair, 0.5 carried.
    const total = Array.from({ length: 17 }, () => 1.5).reduce((a, b) => a + b, 0);
    expect(total).toBe(25.5);
    expect(matchLegs(total, 25, 25)).toMatchObject({ pairs: 1, carryLeft: 0.5, carryRight: 0 });
  });
});
