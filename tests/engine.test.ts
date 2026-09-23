import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { BinaryVolume, BonusEntry, Member, MemberAward, Milestone, Notification, Order, PvEntry, VolumeEntry, Wallet } from "@/lib/models";
import { activateMember } from "@/lib/services/members";
import { getGenerationStats, getMemberGeneration, getNodeChildren, networkSummary } from "@/lib/services/network";
import { groupPv, personalPv } from "@/lib/services/binary";
import { calculateMemberAwards } from "@/lib/services/awards";
import { getWallet, reconcileWallet, requestPayout, setPayoutStatus } from "@/lib/services/wallet";
import { withTx } from "@/lib/services/tx";
import { closeDb, freshDb, getMember, join, joinActive, setRules } from "./helpers";

beforeEach(freshDb);
afterAll(closeDb);

describe("registration and placement", () => {
  it("records the full lineage and each leg", async () => {
    const root = await joinActive(undefined, "left", "thumb");
    const a = await join(root, "left");
    const b = await join(root, "right");
    const c = await join(a, "right");
    const mc = await getMember(c);
    expect(mc!.lineage).toEqual([
      { m: root, leg: "left" },
      { m: a, leg: "right" },
    ]);
    expect(mc!.depth).toBe(2);
    expect((await getMember(b))!.lineage).toEqual([{ m: root, leg: "right" }]);
    expect(await getMemberGeneration(root, c)).toBe(3);
    expect(await getMemberGeneration(b, c)).toBeNull();
  });

  it("spills over into the chosen leg when the slot is taken", async () => {
    const root = await joinActive(undefined);
    const a = await join(root, "left");
    const b = await join(root, "left"); // left taken → under a
    const mb = await getMember(b);
    expect(mb!.placementParent).toBe(a);
    expect(mb!.sponsorCode).toBe(root);
    expect(mb!.lineage[0]).toEqual({ m: root, leg: "left" });
  });

  it("never puts two members in one slot, even when registering concurrently", async () => {
    const root = await joinActive(undefined);
    const codes = await Promise.all(Array.from({ length: 16 }, () => join(root, "left")));
    const placed = await Member.find({ memberCode: { $in: codes } }).lean();
    const slots = placed.map((m) => `${m.placementParent}:${m.position}`);
    expect(new Set(slots).size).toBe(codes.length);
    // No one is their own ancestor.
    for (const m of placed) expect(m.lineage.some((s) => s.m === m.memberCode)).toBe(false);
  });

  it("rejects an unknown sponsor and a second root", async () => {
    await joinActive(undefined);
    await expect(join("DHI-NOPE99")).rejects.toThrow(/No member has that code/);
    await expect(join(undefined)).rejects.toThrow(/sponsor code is required/);
  });

  it("opens a pending package order and pays nothing at registration", async () => {
    const root = await joinActive(undefined, "left", "ring");
    const a = await join(root, "left", "index");
    const order = await Order.findOne({ buyer: a, kind: "package" }).lean();
    expect(order!.total).toBe(76_800);
    expect(order!.paymentStatus).toBe("pending");
    expect(await BonusEntry.countDocuments({ member: root })).toBe(0);
    expect(await Notification.countDocuments({ member: root, type: "new_referral" })).toBe(1);
  });
});

describe("activation, PV and direct sponsorship", () => {
  it("credits package PV and pays the sponsor's direct bonus", async () => {
    const root = await joinActive(undefined, "left", "ring");
    const a = await join(root, "left", "index");
    await activateMember(a, "office", "MOMO-123");

    expect(await personalPv(a)).toBe(75);
    const bonus = await BonusEntry.findOne({ member: root, type: "DIRECT_SPONSORSHIP" }).lean();
    expect(bonus!.amount).toBe(13_125); // 75 × 500 × 35%
    expect(bonus!.status).toBe("approved");
    expect(bonus!.fromMember).toBe(a);
    expect(bonus!.rateBps).toBe(3500);
    expect((await getWallet(root)).available).toBe(13_125);
  });

  it("cannot activate twice or pay the direct bonus twice", async () => {
    const root = await joinActive(undefined);
    const a = await join(root, "left");
    await activateMember(a, "office");
    await expect(activateMember(a, "office")).rejects.toThrow(/déjà actif/);
    expect(await BonusEntry.countDocuments({ type: "DIRECT_SPONSORSHIP" })).toBe(1);
    expect(await PvEntry.countDocuments({ member: a })).toBe(1);
  });

  it("holds an inactive sponsor's bonus as pending until their own package is confirmed", async () => {
    const root = await joinActive(undefined, "left", "thumb");
    const s = await join(root, "left", "ring"); // sponsor, not yet paid
    const r = await join(s, "left", "little");
    await activateMember(r, "office");
    let bonus = await BonusEntry.findOne({ member: s, type: "DIRECT_SPONSORSHIP" }).lean();
    expect(bonus!.status).toBe("pending");
    expect((await getWallet(s)).pending).toBe(bonus!.amount);

    await activateMember(s, "office");
    bonus = await BonusEntry.findOne({ member: s, type: "DIRECT_SPONSORSHIP" }).lean();
    expect(bonus!.status).toBe("approved");
    expect(await getWallet(s)).toMatchObject({ pending: 0, available: bonus!.amount });
  });
});

describe("binary bonus", () => {
  it("matches left and right volume at the sponsor's package rate and carries the rest", async () => {
    const root = await joinActive(undefined, "left", "ring");
    const l = await joinActive(root, "left", "index"); // 75 PV left
    let bv = await BinaryVolume.findOne({ member: root }).lean();
    expect(bv).toMatchObject({ carryLeft: 75, carryRight: 0, pairs: 0 });

    await joinActive(root, "right", "little"); // 25 PV right → 1 pair
    bv = await BinaryVolume.findOne({ member: root }).lean();
    expect(bv).toMatchObject({ carryLeft: 50, carryRight: 0, matchedPv: 25, pairs: 1 });

    const bin = await BonusEntry.findOne({ member: root, type: "BINARY" }).lean();
    expect(bin!.amount).toBe(2500); // 25 × 500 × 20%
    expect(bin!.details).toMatchObject({ leftBefore: 75, rightBefore: 25, matchedPv: 25, carryLeftAfter: 50, carryRightAfter: 0 });

    // The carried 50 PV is still there for the next right-side volume.
    await joinActive(root, "right", "index"); // +75 right → 2 more pairs, carry 0 / 25
    bv = await BinaryVolume.findOne({ member: root }).lean();
    expect(bv).toMatchObject({ carryLeft: 0, carryRight: 25, matchedPv: 75, pairs: 3 });
    void l;
  });

  it("does not pay an inactive member, then matches their carry at activation", async () => {
    const root = await joinActive(undefined, "left", "thumb");
    const p = await join(root, "left", "ring"); // pending
    await joinActive(p, "left", "little");
    await joinActive(p, "right", "little");
    expect(await BonusEntry.countDocuments({ member: p, type: "BINARY" })).toBe(0);
    expect(await BinaryVolume.findOne({ member: p }).lean()).toMatchObject({ carryLeft: 25, carryRight: 25 });

    await activateMember(p, "office");
    expect(await BonusEntry.countDocuments({ member: p, type: "BINARY" })).toBe(1);
  });

  it("stops at the 8th generation", async () => {
    const root = await joinActive(undefined, "left", "ring");
    // A single chain down the left: generations 2..9 below root.
    let parent = root;
    const chain: string[] = [];
    for (let i = 0; i < 8; i++) {
      parent = await join(parent, "left", "little");
      chain.push(parent);
    }
    await activateMember(chain[6], "office"); // generation 8
    await activateMember(chain[7], "office"); // generation 9

    const fromGen8 = await VolumeEntry.findOne({ member: root, fromMember: chain[6] }).lean();
    expect(fromGen8!.generation).toBe(8);
    expect(await VolumeEntry.exists({ member: root, fromMember: chain[7] })).toBeNull();
    // Generation 9 still reaches everyone within 7 levels of it.
    expect(await VolumeEntry.exists({ member: chain[0], fromMember: chain[7] })).not.toBeNull();

    const stats = await getGenerationStats(root);
    expect(stats!.generations.map((g) => g.memberCount)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(stats!.currentGeneration).toBe(8);
    expect(stats!.beyondLimit).toBe(1);
    expect(stats!.generations.find((g) => g.generation === 8)!.pv).toBe(25);
  });
});

describe("generation stats and network", () => {
  it("counts per generation from the genealogy, and lazily loads children", async () => {
    const root = await joinActive(undefined, "left", "ring");
    const a = await joinActive(root, "left");
    const b = await join(root, "right");
    await joinActive(a, "left");
    await join(a, "right");
    await join(b, "left");

    const stats = await getGenerationStats(root);
    expect(stats!.generations[0]).toMatchObject({ generation: 2, capacity: 2, memberCount: 2, activeCount: 1, complete: true });
    expect(stats!.generations[1]).toMatchObject({ generation: 3, capacity: 4, memberCount: 3, activeCount: 1, complete: false });

    const summary = await networkSummary(root);
    expect(summary).toMatchObject({ total: 5, active: 2, left: 3, right: 2, sponsored: 2 });

    const kids = await getNodeChildren(root, a);
    expect(kids!.map((k) => k.position)).toEqual(["left", "right"]);
    expect(kids![0].generation).toBe(3);
    // A member cannot open someone outside their own downline.
    expect(await getNodeChildren(b, a)).toBeNull();
  });
});

describe("fast cumulation", () => {
  it("is recorded once when the structure is complete, separately from the binary", async () => {
    await setRules({ fastCumulation: { people: 2, amount: 50_000 } });
    const root = await joinActive(undefined, "left", "ring");
    await joinActive(root, "left", "little");
    expect(await Milestone.countDocuments({ member: root })).toBe(0);
    await joinActive(root, "right", "little");

    expect(await Milestone.countDocuments({ member: root, kind: "fast_cumulation" })).toBe(1);
    const fc = await BonusEntry.findOne({ member: root, type: "FAST_CUMULATION" }).lean();
    expect(fc!.amount).toBe(50_000);
    // Binary for the same event is its own entry.
    expect(await BonusEntry.countDocuments({ member: root, type: "BINARY" })).toBe(1);

    await joinActive(root, "left", "little");
    expect(await BonusEntry.countDocuments({ member: root, type: "FAST_CUMULATION" })).toBe(1);
  });

  it("records the milestone without paying while the amount is unset", async () => {
    await setRules({ fastCumulation: { people: 2 } });
    const root = await joinActive(undefined);
    await joinActive(root, "left");
    await joinActive(root, "right");
    expect(await Milestone.countDocuments({ member: root })).toBe(1);
    expect(await BonusEntry.countDocuments({ type: "FAST_CUMULATION" })).toBe(0);
  });
});

describe("awards", () => {
  it("unlocks Star from the active network and cascades Emerald to the sponsor", async () => {
    await setRules({ awards: [{ id: "star", networkPeople: 2 }, { id: "emerald", groupPv: 100 }] });
    const top = await joinActive(undefined, "left", "ring"); // 125 PV
    const s = await joinActive(top, "left", "little");
    await joinActive(s, "left", "little");
    expect(await MemberAward.exists({ member: s, award: "star" })).toBeNull();
    await joinActive(s, "right", "little");

    expect(await MemberAward.exists({ member: s, award: "star" })).not.toBeNull();
    // top: Ring ✓, 1 sponsored Star ✓, group PV 125 + 75 ≥ 100 ✓
    expect(await MemberAward.exists({ member: top, award: "emerald" })).not.toBeNull();

    const result = await calculateMemberAwards(top);
    expect(result!.awards.find((a) => a.award === "emerald")!.status).toBe("unlocked");
    expect(result!.awards.find((a) => a.award === "diamond")!.status).toBe("locked"); // needs Middle
  });

  it("group PV is own PV plus downline volume within the limit", async () => {
    const root = await joinActive(undefined, "left", "ring"); // 125
    await joinActive(root, "left", "index"); // 75
    await joinActive(root, "right", "middle"); // 400
    expect(await groupPv(root)).toBe(600);
  });
});

describe("wallet and payouts", () => {
  it("keeps running balances equal to the ledger", async () => {
    const root = await joinActive(undefined, "left", "thumb");
    await joinActive(root, "left", "ring");
    await joinActive(root, "right", "ring");
    const w = await getWallet(root);
    expect(w).toEqual(await reconcileWallet(root));
    expect(w.available).toBeGreaterThan(0);
  });

  it("holds a withdrawal, then settles it as paid or returns it on failure", async () => {
    const root = await joinActive(undefined, "left", "thumb");
    await joinActive(root, "left", "thumb"); // 250 000 direct
    const before = await getWallet(root);

    const p1 = await withTx((s) => requestPayout(root, { amount: 100_000, method: "mobile_money", destination: "+22890000000" }, s));
    expect(await getWallet(root)).toMatchObject({ available: before.available - 100_000, locked: 100_000 });
    await withTx((s) => setPayoutStatus(String(p1._id), "paid", "office", s, { providerRef: "TX1" }));
    expect(await getWallet(root)).toMatchObject({ locked: 0, withdrawn: 100_000 });

    const p2 = await withTx((s) => requestPayout(root, { amount: 50_000, method: "mobile_money", destination: "+22890000000" }, s));
    await withTx((s) => setPayoutStatus(String(p2._id), "failed", "office", s, { reason: "Numéro invalide" }));
    expect(await getWallet(root)).toMatchObject({ available: before.available - 100_000, locked: 0 });
    expect(await getWallet(root)).toEqual(await reconcileWallet(root));

    await expect(withTx((s) => setPayoutStatus(String(p1._id), "failed", "office", s))).rejects.toThrow();
  });

  it("refuses more than the available balance, even when requests race", async () => {
    const root = await joinActive(undefined, "left", "thumb");
    await joinActive(root, "left", "little"); // 25 × 500 × 50% = 6 250
    const { available } = await getWallet(root);
    expect(available).toBe(6_250);
    const tries = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        withTx((s) => requestPayout(root, { amount: 6_000, method: "mobile_money", destination: "+22890000000" }, s))
      )
    );
    expect(tries.filter((t) => t.status === "fulfilled")).toHaveLength(1);
    const w = await Wallet.findOne({ member: root }).lean();
    expect(w!.available).toBe(250);
  });
});
