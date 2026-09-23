import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { AffiliateClick, BinaryVolume, BonusEntry, Member, Product, PvEntry } from "@/lib/models";
import { affiliateStats, recordClick } from "@/lib/services/affiliate";
import { canReview, setCartItem, submitReview } from "@/lib/services/catalog";
import { placeOrder, priceItems, setOrderStatus } from "@/lib/services/orders";
import { getWallet, reconcileWallet } from "@/lib/services/wallet";
import { closeDb, freshDb, joinActive, join, makeProduct } from "./helpers";

beforeEach(freshDb);
afterAll(closeDb);

const buyerOf = (code: string) =>
  Member.findOne({ memberCode: code }).select("memberCode packageId status fullName").lean();

const shipping = { address: "Rue 12, Bè", city: "Lomé" };

async function checkout(owner: string, buyerCode: string | null, affiliate: string | null = null) {
  const buyer = buyerCode ? await buyerOf(buyerCode) : null;
  return placeOrder({
    cartOwner: owner,
    buyer,
    guest: buyer ? null : { name: "Client Invité", phone: "+22891000000" },
    shipping,
    paymentMethod: "mobile_money",
    affiliate: affiliate ? { member: affiliate, click: null } : null,
  });
}

describe("member pricing", () => {
  it("applies the active member's package discount server-side", async () => {
    const root = await joinActive(undefined, "left", "ring");
    const p = await makeProduct({ price: 100_000 });
    const priced = await priceItems([{ product: p._id, qty: 1 }], await buyerOf(root));
    expect(priced).toMatchObject({ subtotal: 100_000, discount: 20_000, total: 80_000, discountBps: 2000 });
    const guest = await priceItems([{ product: p._id, qty: 1 }], null);
    expect(guest.total).toBe(100_000);
  });

  it("gives no discount to a member whose package is not confirmed", async () => {
    const root = await joinActive(undefined);
    const pending = await join(root, "left", "thumb");
    const p = await makeProduct({ price: 100_000 });
    const priced = await priceItems([{ product: p._id, qty: 1 }], await buyerOf(pending));
    expect(priced.discount).toBe(0);
  });
});

describe("checkout and stock", () => {
  it("creates the order from server prices and reserves stock", async () => {
    const root = await joinActive(undefined, "left", "middle");
    const p = await makeProduct({ price: 1_250_000, stock: 2 });
    await setCartItem(`m:${root}`, String(p._id), 2);
    const order = await checkout(`m:${root}`, root);
    expect(order.total).toBe(2_500_000 - 562_500); // 22.5% off
    expect((await Product.findById(p._id).lean())!.stock).toBe(0);
    await expect(setCartItem(`m:${root}`, String(p._id), 1)).rejects.toThrow(/en stock/);
  });

  it("refuses an empty cart", async () => {
    await expect(checkout("g:empty", null)).rejects.toThrow(/vide/);
  });
});

describe("affiliate tracking", () => {
  it("counts a visitor once inside the window and ignores invalid referrals", async () => {
    const aff = await joinActive(undefined);
    const p = await makeProduct({ slug: "lit-medicalise" });
    const first = await recordClick({ ref: aff, slug: p.slug, visitorId: "v1", ip: "1.1.1.1" });
    const again = await recordClick({ ref: aff, slug: p.slug, visitorId: "v1", ip: "1.1.1.1" });
    await recordClick({ ref: aff, slug: p.slug, visitorId: "v2", ip: "2.2.2.2" });
    expect(first!.counted).toBe(true);
    expect(again!.counted).toBe(false);

    expect(await recordClick({ ref: "DHI-ZZZZZZ", slug: p.slug, visitorId: "v3", ip: "x" })).toBeNull();
    expect(await recordClick({ ref: "not a code", slug: p.slug, visitorId: "v3", ip: "x" })).toBeNull();
    const pending = await join(aff, "left");
    expect(await recordClick({ ref: pending, slug: p.slug, visitorId: "v3", ip: "x" })).toBeNull();

    const stats = await affiliateStats(aff);
    expect(stats).toMatchObject({ clicks: 2, duplicates: 1, uniqueVisitors: 2, sales: 0 });
    expect(await AffiliateClick.countDocuments()).toBe(3);
  });
});

describe("affiliate commission lifecycle", () => {
  it("pending on payment, payable on delivery", async () => {
    const aff = await joinActive(undefined, "left", "ring");
    const p = await makeProduct({ price: 1_250_000 });
    await setCartItem("g:guest1", String(p._id), 1);
    const order = await checkout("g:guest1", null, aff);
    expect(await BonusEntry.countDocuments({ type: "AFFILIATE_COMMISSION" })).toBe(0); // unpaid order

    await setOrderStatus(String(order._id), "confirmed", "office", { paymentRef: "MOMO-9" });
    let c = await BonusEntry.findOne({ member: aff, type: "AFFILIATE_COMMISSION" }).lean();
    expect(c).toMatchObject({ amount: 100_000, status: "pending" });
    expect((await getWallet(aff)).pending).toBe(100_000);

    await setOrderStatus(String(order._id), "shipped", "office");
    await setOrderStatus(String(order._id), "delivered", "office");
    c = await BonusEntry.findOne({ member: aff, type: "AFFILIATE_COMMISSION" }).lean();
    expect(c!.status).toBe("approved");
    const w = await getWallet(aff);
    expect(w).toMatchObject({ pending: 0 });
    expect(w).toEqual(await reconcileWallet(aff));

    const stats = await affiliateStats(aff);
    expect(stats).toMatchObject({ sales: 1, commissionApproved: 100_000 });
  });

  it("reverses the commission and PV on refund", async () => {
    const aff = await joinActive(undefined, "left", "ring");
    const buyer = await joinActive(aff, "left", "little");
    const p = await makeProduct({ price: 200_000, pv: 40 });
    await setCartItem(`m:${buyer}`, String(p._id), 1);
    const order = await checkout(`m:${buyer}`, buyer, aff);
    await setOrderStatus(String(order._id), "confirmed", "office");

    expect(await PvEntry.countDocuments({ member: buyer, type: "product_purchase" })).toBe(1);
    const leftBefore = (await BinaryVolume.findOne({ member: aff }).lean())!.carryLeft;
    expect(leftBefore).toBe(25 + 40);

    await setOrderStatus(String(order._id), "refunded", "office", { note: "Produit défectueux" });
    const c = await BonusEntry.findOne({ member: aff, type: "AFFILIATE_COMMISSION" }).lean();
    expect(c!.status).toBe("reversed");
    const pvRows = await PvEntry.find({ member: buyer }).lean();
    expect(pvRows.reduce((n, r) => n + r.pv, 0)).toBe(25); // package PV only
    expect((await BinaryVolume.findOne({ member: aff }).lean())!.carryLeft).toBe(25);
    expect((await Product.findById(p._id).lean())!.stock).toBe(5);
    expect(await getWallet(aff)).toEqual(await reconcileWallet(aff));
  });

  it("pays no commission on a cancelled unpaid order, or to a buyer referring themselves", async () => {
    const aff = await joinActive(undefined);
    const p = await makeProduct();
    await setCartItem(`m:${aff}`, String(p._id), 1);
    const self = await checkout(`m:${aff}`, aff, aff);
    expect(self.affiliate).toBeNull();

    await setCartItem("g:g2", String(p._id), 1);
    const o = await checkout("g:g2", null, aff);
    await setOrderStatus(String(o._id), "cancelled", "office");
    expect(await BonusEntry.countDocuments({ type: "AFFILIATE_COMMISSION" })).toBe(0);
  });

  it("enforces the order lifecycle", async () => {
    const p = await makeProduct();
    await setCartItem("g:g3", String(p._id), 1);
    const o = await checkout("g:g3", null);
    await expect(setOrderStatus(String(o._id), "delivered", "office")).rejects.toThrow(/Impossible/);
  });
});

describe("reviews", () => {
  it("only a member with a delivered order can review, once", async () => {
    const m = await joinActive(undefined);
    const p = await makeProduct();
    const who = { memberCode: m, fullName: "Ama Mensah" };
    await expect(submitReview(who, p.slug, 5, "Top")).rejects.toThrow(/Seuls/);

    await setCartItem(`m:${m}`, String(p._id), 1);
    const o = await checkout(`m:${m}`, m);
    for (const s of ["confirmed", "shipped", "delivered"] as const) await setOrderStatus(String(o._id), s, "office");
    expect(await canReview(m, p.slug)).toEqual({ bought: true, alreadyReviewed: false });

    const r = await submitReview(who, p.slug, 4, "Solide et bien livré.");
    expect(r.status).toBe("pending");
    await expect(submitReview(who, p.slug, 5, "Encore")).rejects.toThrow(/déjà/);
    await expect(submitReview(who, "x", 9, "")).rejects.toThrow(/note/);
  });
});
