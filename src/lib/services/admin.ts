import { randomUUID } from "node:crypto";
import {
  BinaryVolume,
  BonusEntry,
  Category,
  Member,
  MemberAward,
  Order,
  Payout,
  Product,
  PvEntry,
  Review,
  VolumeEntry,
  type MemberDoc,
} from "../models";
import { formatFcfa } from "../plan";
import { isPv } from "../money";
import { creditPv } from "./binary";
import { notify } from "./notifications";
import { settleUpline } from "./settle";
import { BusinessError, withTx } from "./tx";
import { getWallet, reconcileWallet, recordBonus } from "./wallet";

export async function adminStats() {
  const root = await Member.findOne({ placementParent: null }).select("memberCode").lean();
  const [
    members,
    active,
    pending,
    pv,
    rootLegs,
    bonuses,
    sales,
    payouts,
    awards,
    pendingOrders,
    pendingReviews,
  ] = await Promise.all([
    Member.countDocuments(),
    Member.countDocuments({ status: "active" }),
    Member.countDocuments({ status: "pending" }),
    PvEntry.aggregate([{ $group: { _id: "$type", pv: { $sum: "$pv" } } }]),
    root ? BinaryVolume.findOne({ member: root.memberCode }).lean() : null,
    BonusEntry.aggregate([{ $group: { _id: { type: "$type", status: "$status" }, total: { $sum: "$amount" } } }]),
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: "$kind", total: { $sum: "$total" }, n: { $sum: 1 } } },
    ]),
    Payout.aggregate([{ $group: { _id: "$status", total: { $sum: "$amount" }, n: { $sum: 1 } } }]),
    MemberAward.aggregate([{ $group: { _id: { award: "$award", reward: "$rewardStatus" }, n: { $sum: 1 } } }]),
    Order.countDocuments({ kind: "marketplace", status: "pending" }),
    Review.countDocuments({ status: "pending" }),
  ]);

  const bonusBy: Record<string, Record<string, number>> = {};
  for (const b of bonuses) (bonusBy[b._id.type] ??= {})[b._id.status] = b.total;
  const payoutBy = Object.fromEntries(payouts.map((p) => [p._id, { total: p.total, n: p.n }]));

  return {
    members: { total: members, active, pending },
    pv: {
      total: pv.reduce((n, r) => n + r.pv, 0),
      byType: Object.fromEntries(pv.map((r) => [r._id, r.pv])),
      rootLeft: rootLegs?.totalLeft ?? 0,
      rootRight: rootLegs?.totalRight ?? 0,
    },
    bonuses: bonusBy,
    sales: Object.fromEntries(sales.map((s) => [s._id, { total: s.total, n: s.n }])),
    payouts: payoutBy,
    awards: awards.map((a) => ({ award: a._id.award, rewardStatus: a._id.reward, n: a.n })),
    queues: {
      pendingMembers: pending,
      pendingOrders,
      pendingPayouts: (payoutBy.pending?.n ?? 0) + (payoutBy.processing?.n ?? 0),
      pendingReviews,
    },
  };
}

/** Everything behind a member's figures, for "why is this number what it is?" */
export async function inspectMember(memberCode: string) {
  const member = await Member.findOne({ memberCode }).select("-passwordHash").lean<MemberDoc>();
  if (!member) return null;
  const [pv, bonuses, volume, binary, wallet, ledgerWallet, payouts, awards] = await Promise.all([
    PvEntry.find({ member: memberCode }).sort({ createdAt: -1 }).limit(100).lean(),
    BonusEntry.find({ member: memberCode }).sort({ createdAt: -1 }).limit(100).lean(),
    VolumeEntry.find({ member: memberCode }).sort({ createdAt: -1 }).limit(100).lean(),
    BinaryVolume.findOne({ member: memberCode }).lean(),
    getWallet(memberCode),
    reconcileWallet(memberCode),
    Payout.find({ member: memberCode }).sort({ createdAt: -1 }).limit(50).lean(),
    MemberAward.find({ member: memberCode }).lean(),
  ]);
  const drift = (Object.keys(wallet) as (keyof typeof wallet)[]).filter((k) => wallet[k] !== ledgerWallet[k]);
  return { member, pv, bonuses, volume, binary, wallet, ledgerWallet, walletConsistent: drift.length === 0, drift, payouts, awards };
}

/** Manual corrections. Always a new, explained ledger entry — never an edit. */
export async function adjust(input: { member: string; kind: "pv" | "bonus"; amount: number; note: string }, by: string) {
  if (!Number.isSafeInteger(input.amount) || input.amount === 0) throw new BusinessError("Montant invalide.", 422, "amount");
  if (input.note.trim().length < 5) throw new BusinessError("Expliquez la correction.", 422, "note");
  return withTx(async (session) => {
    const member = await Member.findOne({ memberCode: input.member }).session(session).lean<MemberDoc>();
    if (!member) throw new BusinessError("Membre introuvable.", 404);
    const id = randomUUID();
    if (input.kind === "pv") {
      await creditPv(
        {
          member: input.member,
          pv: input.amount,
          type: "adjustment",
          sourceType: "admin",
          sourceId: id,
          key: `adj-pv:${id}`,
          note: input.note,
          createdBy: by,
        },
        session
      );
      await settleUpline(member, session);
    } else {
      await recordBonus(
        {
          member: input.member,
          type: "ADJUSTMENT",
          amount: input.amount,
          status: "approved",
          sourceType: "admin",
          sourceId: id,
          details: { by, note: input.note },
          description: `Ajustement : ${input.note}`,
          key: `adj-bonus:${id}`,
        },
        session
      );
      await notify(
        session,
        input.member,
        "bonus_earned",
        "Ajustement de solde",
        `${input.amount > 0 ? "+" : ""}${formatFcfa(input.amount)} — ${input.note}`,
        "/dashboard/paiements"
      );
    }
    return { id };
  });
}

/* ---- Catalogue administration ----------------------------------------- */

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const lines = (v: unknown) =>
  (Array.isArray(v) ? v : String(v ?? "").split("\n"))
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 20);

export async function saveProduct(input: Record<string, unknown>, id?: string) {
  const errors: Record<string, string> = {};
  const name = String(input.name ?? "").trim();
  if (name.length < 3) errors.name = "Nom requis.";
  const category = String(input.category ?? "");
  if (!(await Category.exists({ slug: category }))) errors.category = "Catégorie inconnue.";
  const price = Number(input.price);
  if (!Number.isSafeInteger(price) || price < 0) errors.price = "Prix en FCFA entiers.";
  const stock = Number(input.stock);
  if (!Number.isSafeInteger(stock) || stock < 0) errors.stock = "Stock entier ≥ 0.";
  const pv = Number(input.pv ?? 0);
  if (!isPv(pv) || pv < 0) errors.pv = "PV ≥ 0, par pas de 0,5.";
  const aff = input.affiliateBps === "" || input.affiliateBps == null ? null : Number(input.affiliateBps);
  if (aff !== null && (!Number.isInteger(aff) || aff < 0 || aff > 10_000)) errors.affiliateBps = "Entre 0 et 10 000 points de base.";
  const images = lines(input.images).filter((u) => /^https:\/\//.test(u));
  if (Object.keys(errors).length) throw new BusinessError("Vérifiez les champs.", 422, undefined, errors);

  const doc = {
    name,
    category,
    price,
    stock,
    pv,
    affiliateBps: aff,
    images,
    summary: String(input.summary ?? "").trim().slice(0, 300),
    description: String(input.description ?? "").trim().slice(0, 5000),
    characteristics: lines(input.characteristics),
    delivery: String(input.delivery ?? "").trim().slice(0, 300),
    warranty: String(input.warranty ?? "").trim().slice(0, 300),
    returns: String(input.returns ?? "").trim().slice(0, 300),
    status: input.status === "draft" ? "draft" : "active",
  };
  if (id) {
    const p = await Product.findByIdAndUpdate(id, { $set: doc }, { new: true });
    if (!p) throw new BusinessError("Produit introuvable.", 404);
    return p;
  }
  let slug = slugify(String(input.slug || name));
  if (await Product.exists({ slug })) slug = `${slug}-${randomUUID().slice(0, 4)}`;
  return Product.create({ ...doc, slug });
}

export async function saveCategory(input: Record<string, unknown>) {
  const name = String(input.name ?? "").trim();
  if (name.length < 2) throw new BusinessError("Nom requis.", 422, "name");
  const slug = slugify(String(input.slug || name));
  if (await Category.exists({ slug })) throw new BusinessError("Cette catégorie existe déjà.", 409, "name");
  const order = (await Category.countDocuments()) + 1;
  return Category.create({ slug, name, order });
}
