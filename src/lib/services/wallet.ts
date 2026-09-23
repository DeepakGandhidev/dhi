import type { ClientSession } from "mongoose";
import {
  BonusEntry,
  Payout,
  Wallet,
  type BonusEntryDoc,
  type BonusType,
  type PayoutStatus,
} from "../models";
import { assertFcfa } from "../money";
import { notify } from "./notifications";
import { getRules } from "./rules";
import { BusinessError } from "./tx";
import { nextReference } from "./counters";
import { formatFcfa } from "../plan";

/**
 * The bonus ledger and the wallet it feeds. Every function here takes the
 * caller's session: a bonus and the balance it changes are written together
 * or not at all.
 */

export type NewBonus = {
  member: string;
  type: BonusType;
  amount: number;
  pv?: number;
  rateBps?: number;
  status: "pending" | "approved";
  sourceType: BonusEntryDoc["sourceType"];
  sourceId: string;
  fromMember?: string | null;
  generation?: number | null;
  details?: Record<string, unknown>;
  description: string;
  key: string;
};

/**
 * Records a bonus and moves the wallet. Idempotent on `key`: the same event
 * can be processed twice (a retried request, a double click) and pays once.
 * Returns null when the key already exists.
 */
export async function recordBonus(b: NewBonus, session: ClientSession) {
  assertFcfa(b.amount);
  const exists = await BonusEntry.exists({ key: b.key }).session(session);
  if (exists) return null;

  const [entry] = await BonusEntry.create(
    [
      {
        ...b,
        pv: b.pv ?? 0,
        rateBps: b.rateBps ?? 0,
        details: b.details ?? {},
        history: [{ status: b.status, at: new Date(), by: "system" }],
      },
    ],
    { session }
  );

  if (b.amount !== 0) {
    const inc =
      b.status === "approved"
        ? { available: b.amount, lifetime: b.amount }
        : { pending: b.amount };
    await Wallet.updateOne({ member: b.member }, { $inc: inc }, { upsert: true, session });
  }
  return entry;
}

/** pending → approved: the money becomes withdrawable. */
export async function approveBonus(id: string, by: string, session: ClientSession, note?: string) {
  const entry = await BonusEntry.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "approved" }, $push: { history: { status: "approved", at: new Date(), by, note } } },
    { new: true, session }
  );
  if (!entry) return null;
  await Wallet.updateOne(
    { member: entry.member },
    { $inc: { pending: -entry.amount, available: entry.amount, lifetime: entry.amount } },
    { upsert: true, session }
  );
  return entry;
}

/**
 * Cancels a bonus. An approved one is taken back out of the available
 * balance; if it was already withdrawn the balance goes negative, and future
 * earnings settle it before anything else can be withdrawn.
 */
export async function reverseBonus(id: string, by: string, session: ClientSession, note: string) {
  const entry = await BonusEntry.findOneAndUpdate(
    { _id: id, status: { $in: ["pending", "approved"] } },
    { $set: { status: "reversed" }, $push: { history: { status: "reversed", at: new Date(), by, note } } },
    { new: false, session }
  );
  if (!entry) return null;
  const inc =
    entry.status === "approved"
      ? { available: -entry.amount, lifetime: -entry.amount }
      : { pending: -entry.amount };
  await Wallet.updateOne({ member: entry.member }, { $inc: inc }, { upsert: true, session });
  return entry;
}

export async function getWallet(member: string) {
  const w = await Wallet.findOne({ member }).lean();
  return {
    available: w?.available ?? 0,
    pending: w?.pending ?? 0,
    locked: w?.locked ?? 0,
    withdrawn: w?.withdrawn ?? 0,
    lifetime: w?.lifetime ?? 0,
  };
}

/**
 * Recomputes the balances from the ledger alone. Used by tests and by the
 * admin "check" action to prove the running totals have not drifted.
 */
export async function reconcileWallet(member: string, session?: ClientSession) {
  const [bonuses, payouts] = await Promise.all([
    BonusEntry.aggregate([
      { $match: { member } },
      { $group: { _id: "$status", total: { $sum: "$amount" } } },
    ]).session(session ?? null),
    Payout.aggregate([
      { $match: { member } },
      { $group: { _id: "$status", total: { $sum: "$amount" } } },
    ]).session(session ?? null),
  ]);
  const b = Object.fromEntries(bonuses.map((x) => [x._id, x.total])) as Record<string, number>;
  const p = Object.fromEntries(payouts.map((x) => [x._id, x.total])) as Record<string, number>;
  const approved = b.approved ?? 0;
  const locked = (p.pending ?? 0) + (p.processing ?? 0);
  const withdrawn = p.paid ?? 0;
  return {
    available: approved - locked - withdrawn,
    pending: b.pending ?? 0,
    locked,
    withdrawn,
    lifetime: approved,
  };
}

/** Earnings per bonus type, split by status. */
export async function earningsByType(member: string) {
  const rows = await BonusEntry.aggregate([
    { $match: { member } },
    { $group: { _id: { type: "$type", status: "$status" }, total: { $sum: "$amount" }, n: { $sum: 1 } } },
  ]);
  const out: Record<string, { approved: number; pending: number; reversed: number; count: number }> = {};
  for (const r of rows) {
    const t = (out[r._id.type] ??= { approved: 0, pending: 0, reversed: 0, count: 0 });
    t[r._id.status as "approved" | "pending" | "reversed"] += r.total;
    t.count += r.n;
  }
  return out;
}

/* ---- Payouts ----------------------------------------------------------- */

export async function requestPayout(
  member: string,
  input: { amount: number; method: "mobile_money" | "bank" | "cash"; destination: string },
  session: ClientSession
) {
  const rules = await getRules(session);
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new BusinessError("Montant invalide.", 422, "amount");
  }
  if (input.amount < rules.minPayout) {
    throw new BusinessError(`Le retrait minimum est de ${formatFcfa(rules.minPayout)}.`, 422, "amount");
  }
  const destination = input.destination.trim();
  if (destination.length < 6) {
    throw new BusinessError("Indiquez le numéro ou le compte de paiement.", 422, "destination");
  }

  // The balance check and the hold are one conditional update, so two
  // simultaneous requests cannot both spend the same money.
  const held = await Wallet.findOneAndUpdate(
    { member, available: { $gte: input.amount } },
    { $inc: { available: -input.amount, locked: input.amount } },
    { new: true, session }
  );
  if (!held) throw new BusinessError("Solde disponible insuffisant.", 422, "amount");

  const [payout] = await Payout.create(
    [
      {
        reference: await nextReference("PAY", session),
        member,
        amount: input.amount,
        method: input.method,
        destination,
        status: "pending",
        history: [{ status: "pending", at: new Date(), by: member }],
      },
    ],
    { session }
  );
  return payout;
}

const PAYOUT_FLOW: Record<PayoutStatus, PayoutStatus[]> = {
  pending: ["processing", "paid", "failed", "cancelled"],
  processing: ["paid", "failed"],
  paid: [],
  failed: [],
  cancelled: [],
};

export async function setPayoutStatus(
  id: string,
  to: PayoutStatus,
  by: string,
  session: ClientSession,
  extra: { providerRef?: string; reason?: string } = {}
) {
  const payout = await Payout.findById(id).session(session);
  if (!payout) throw new BusinessError("Paiement introuvable.", 404);
  if (!PAYOUT_FLOW[payout.status].includes(to)) {
    throw new BusinessError(`Impossible de passer de « ${payout.status} » à « ${to} ».`);
  }

  const updated = await Payout.findOneAndUpdate(
    { _id: id, status: payout.status },
    {
      $set: {
        status: to,
        ...(extra.providerRef ? { providerRef: extra.providerRef } : {}),
        ...(extra.reason ? { failureReason: extra.reason } : {}),
      },
      $push: { history: { status: to, at: new Date(), by, note: extra.reason } },
    },
    { new: true, session }
  );
  if (!updated) throw new BusinessError("Ce paiement a été modifié entre-temps. Rechargez.", 409);

  if (to === "paid") {
    await Wallet.updateOne(
      { member: payout.member },
      { $inc: { locked: -payout.amount, withdrawn: payout.amount } },
      { session }
    );
    await notify(
      session,
      payout.member,
      "payment_processed",
      "Paiement effectué",
      `${formatFcfa(payout.amount)} ont été versés (${payout.reference}).`,
      "/dashboard/paiements"
    );
  } else if (to === "failed" || to === "cancelled") {
    await Wallet.updateOne(
      { member: payout.member },
      { $inc: { locked: -payout.amount, available: payout.amount } },
      { session }
    );
    await notify(
      session,
      payout.member,
      "payment_failed",
      to === "failed" ? "Paiement échoué" : "Retrait annulé",
      `${formatFcfa(payout.amount)} sont de nouveau disponibles${extra.reason ? ` — ${extra.reason}` : ""}.`,
      "/dashboard/paiements"
    );
  }
  return updated;
}
