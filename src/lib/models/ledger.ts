import mongoose, { Schema, models, model } from "mongoose";
import type { Leg } from "./member";
import { isPv } from "../money";

/**
 * The financial record. Entries here are append-only: a mistake is corrected
 * by a new entry (a reversal or an adjustment) that points at the original,
 * never by editing or deleting it. The only fields that change after insert
 * are statuses, and each change is written to `history`.
 */

const StatusChange = new Schema(
  { status: String, at: { type: Date, default: Date.now }, by: String, note: String },
  { _id: false }
);

/* ---- PV ledger ---------------------------------------------------------- */

export const PV_TYPES = [
  "package_purchase",
  "product_purchase",
  "adjustment",
  "refund",
  "cancellation",
] as const;
export type PvType = (typeof PV_TYPES)[number];

export interface PvEntryDoc {
  _id: mongoose.Types.ObjectId;
  member: string;
  pv: number; // signed: refunds are negative
  type: PvType;
  sourceType: "order" | "admin";
  sourceId: string;
  /** Idempotency: the same source can never credit PV twice. */
  key: string;
  note?: string;
  createdBy?: string;
  createdAt: Date;
}

const PvEntrySchema = new Schema<PvEntryDoc>(
  {
    member: { type: String, required: true, index: true },
    pv: { type: Number, required: true, validate: isPv },
    type: { type: String, enum: PV_TYPES, required: true },
    sourceType: { type: String, enum: ["order", "admin"], required: true },
    sourceId: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    note: String,
    createdBy: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PvEntry =
  (models.PvEntry as mongoose.Model<PvEntryDoc>) || model<PvEntryDoc>("PvEntry", PvEntrySchema);

/* ---- Binary volume ------------------------------------------------------ */

/**
 * Running binary state for one member: what is waiting on each leg to be
 * matched (carry), and lifetime totals. Updated in the same transaction as
 * the VolumeEntry and BonusEntry that explain each change.
 */
export interface BinaryVolumeDoc {
  member: string;
  carryLeft: number;
  carryRight: number;
  totalLeft: number;
  totalRight: number;
  matchedPv: number;
  pairs: number;
  updatedAt: Date;
}

const BinaryVolumeSchema = new Schema<BinaryVolumeDoc>(
  {
    member: { type: String, required: true, unique: true },
    carryLeft: { type: Number, default: 0, min: 0 },
    carryRight: { type: Number, default: 0, min: 0 },
    totalLeft: { type: Number, default: 0 },
    totalRight: { type: Number, default: 0 },
    matchedPv: { type: Number, default: 0 },
    pairs: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const BinaryVolume =
  (models.BinaryVolume as mongoose.Model<BinaryVolumeDoc>) ||
  model<BinaryVolumeDoc>("BinaryVolume", BinaryVolumeSchema);

/** One PV event arriving on one ancestor's leg. */
export interface VolumeEntryDoc {
  member: string; // the ancestor whose leg grew
  fromMember: string; // whose PV it was
  leg: Leg;
  pv: number;
  /** Generation of fromMember counted from member as 1. */
  generation: number;
  pvEntry: string;
  /** Refunded PV that had already been matched and could not leave the carry. */
  unrecovered: number;
  key: string;
  createdAt: Date;
}

const VolumeEntrySchema = new Schema<VolumeEntryDoc>(
  {
    member: { type: String, required: true },
    fromMember: { type: String, required: true },
    leg: { type: String, enum: ["left", "right"], required: true },
    pv: { type: Number, required: true },
    generation: { type: Number, required: true },
    pvEntry: { type: String, required: true },
    unrecovered: { type: Number, default: 0 },
    key: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
VolumeEntrySchema.index({ member: 1, createdAt: -1 });

export const VolumeEntry =
  (models.VolumeEntry as mongoose.Model<VolumeEntryDoc>) ||
  model<VolumeEntryDoc>("VolumeEntry", VolumeEntrySchema);

/* ---- Bonus ledger ------------------------------------------------------- */

export const BONUS_TYPES = [
  "DIRECT_SPONSORSHIP",
  "BINARY",
  "FAST_CUMULATION",
  "AFFILIATE_COMMISSION",
  "AWARD",
  "ADJUSTMENT",
] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

/**
 * pending   earned, not yet payable (an affiliate sale awaiting delivery)
 * approved  in the member's available balance
 * reversed  cancelled after approval or while pending (refund, cancellation)
 */
export const BONUS_STATUSES = ["pending", "approved", "reversed"] as const;
export type BonusStatus = (typeof BONUS_STATUSES)[number];

export interface BonusEntryDoc {
  _id: mongoose.Types.ObjectId;
  member: string;
  type: BonusType;
  amount: number; // FCFA, whole
  pv: number; // the volume the bonus was computed on
  rateBps: number;
  status: BonusStatus;
  sourceType: "member" | "order" | "binary_match" | "milestone" | "admin";
  sourceId: string;
  fromMember?: string | null;
  generation?: number | null;
  /** Everything needed to recompute the figure by hand. */
  details: Record<string, unknown>;
  description: string;
  key: string;
  history: { status: string; at: Date; by?: string; note?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const BonusEntrySchema = new Schema<BonusEntryDoc>(
  {
    member: { type: String, required: true },
    type: { type: String, enum: BONUS_TYPES, required: true },
    amount: { type: Number, required: true, validate: Number.isInteger },
    pv: { type: Number, default: 0 },
    rateBps: { type: Number, default: 0 },
    status: { type: String, enum: BONUS_STATUSES, required: true },
    sourceType: {
      type: String,
      enum: ["member", "order", "binary_match", "milestone", "admin"],
      required: true,
    },
    sourceId: { type: String, required: true },
    fromMember: { type: String, default: null },
    generation: { type: Number, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    description: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    history: { type: [StatusChange], default: [] },
  },
  { timestamps: true }
);
BonusEntrySchema.index({ member: 1, createdAt: -1 });
BonusEntrySchema.index({ member: 1, type: 1, createdAt: -1 });
BonusEntrySchema.index({ sourceType: 1, sourceId: 1 });

export const BonusEntry =
  (models.BonusEntry as mongoose.Model<BonusEntryDoc>) ||
  model<BonusEntryDoc>("BonusEntry", BonusEntrySchema);

/* ---- Wallet ------------------------------------------------------------- */

/**
 * Balances, maintained in the same transaction as every bonus and payout
 * change so they always equal the sum of the ledger. `reconcileWallet`
 * recomputes them from the ledger to prove it.
 */
export interface WalletDoc {
  member: string;
  available: number;
  pending: number;
  /** Requested but not yet paid out: held back from `available`. */
  locked: number;
  withdrawn: number;
  lifetime: number;
  updatedAt: Date;
}

const WalletSchema = new Schema<WalletDoc>(
  {
    member: { type: String, required: true, unique: true },
    // Can go below zero when an already-withdrawn bonus is reversed.
    available: { type: Number, default: 0 },
    pending: { type: Number, default: 0, min: 0 },
    locked: { type: Number, default: 0, min: 0 },
    withdrawn: { type: Number, default: 0, min: 0 },
    lifetime: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const Wallet =
  (models.Wallet as mongoose.Model<WalletDoc>) || model<WalletDoc>("Wallet", WalletSchema);

export const PAYOUT_STATUSES = ["pending", "processing", "paid", "failed", "cancelled"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export interface PayoutDoc {
  _id: mongoose.Types.ObjectId;
  reference: string;
  member: string;
  amount: number;
  method: "mobile_money" | "bank" | "cash";
  destination: string;
  status: PayoutStatus;
  providerRef?: string;
  failureReason?: string;
  history: { status: string; at: Date; by?: string; note?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<PayoutDoc>(
  {
    reference: { type: String, required: true, unique: true },
    member: { type: String, required: true },
    amount: { type: Number, required: true, min: 1, validate: Number.isInteger },
    method: { type: String, enum: ["mobile_money", "bank", "cash"], required: true },
    destination: { type: String, required: true, maxlength: 120 },
    status: { type: String, enum: PAYOUT_STATUSES, default: "pending" },
    providerRef: String,
    failureReason: String,
    history: { type: [StatusChange], default: [] },
  },
  { timestamps: true }
);
PayoutSchema.index({ member: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, createdAt: -1 });

export const Payout =
  (models.Payout as mongoose.Model<PayoutDoc>) || model<PayoutDoc>("Payout", PayoutSchema);

/* ---- Awards and milestones --------------------------------------------- */

export interface MemberAwardDoc {
  member: string;
  award: "star" | "emerald" | "diamond" | "sapphire";
  unlockedAt: Date;
  /** Snapshot of the figures that qualified the member. */
  evidence: Record<string, unknown>;
  rewardStatus: "to_deliver" | "delivered";
  deliveredAt?: Date | null;
  deliveredBy?: string | null;
}

const MemberAwardSchema = new Schema<MemberAwardDoc>(
  {
    member: { type: String, required: true },
    award: { type: String, enum: ["star", "emerald", "diamond", "sapphire"], required: true },
    unlockedAt: { type: Date, default: Date.now },
    evidence: { type: Schema.Types.Mixed, default: {} },
    rewardStatus: { type: String, enum: ["to_deliver", "delivered"], default: "to_deliver" },
    deliveredAt: { type: Date, default: null },
    deliveredBy: { type: String, default: null },
  },
  { timestamps: true }
);
MemberAwardSchema.index({ member: 1, award: 1 }, { unique: true });
MemberAwardSchema.index({ award: 1 });

export const MemberAward =
  (models.MemberAward as mongoose.Model<MemberAwardDoc>) ||
  model<MemberAwardDoc>("MemberAward", MemberAwardSchema);

/** Fast Cumulation qualification: one per member, ever. */
export interface MilestoneDoc {
  member: string;
  kind: "fast_cumulation";
  reachedAt: Date;
  evidence: Record<string, unknown>;
}

const MilestoneSchema = new Schema<MilestoneDoc>(
  {
    member: { type: String, required: true },
    kind: { type: String, enum: ["fast_cumulation"], required: true },
    reachedAt: { type: Date, default: Date.now },
    evidence: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
MilestoneSchema.index({ member: 1, kind: 1 }, { unique: true });

export const Milestone =
  (models.Milestone as mongoose.Model<MilestoneDoc>) ||
  model<MilestoneDoc>("Milestone", MilestoneSchema);
