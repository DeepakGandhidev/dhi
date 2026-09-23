import mongoose, { Schema, models, model } from "mongoose";

export const PACKAGE_IDS = ["little", "index", "ring", "middle", "thumb"] as const;

export type Leg = "left" | "right";

/** One ancestor in the placement tree, and which of its legs this member is on. */
export type LineageStep = { m: string; leg: Leg };

export type MemberStatus = "pending" | "active" | "suspended";

export interface MemberDoc extends mongoose.Document {
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  avatarUrl?: string;
  packageId: (typeof PACKAGE_IDS)[number];
  memberCode: string;
  passwordHash: string;

  /** Who introduced them. Pays the direct sponsorship bonus. */
  sponsorCode?: string;
  /** The leg the sponsor asked for. Only decides where the search starts. */
  sponsorLeg: Leg;

  /**
   * Where they actually sit in the binary tree. Placement is not sponsorship:
   * spillover means you are usually placed under someone other than your
   * sponsor. Null parent means this member is the root of the tree.
   */
  placementParent: string | null;
  position: Leg | null;
  /** Generations below the root. The root is 0. */
  depth: number;
  /**
   * Every placement ancestor, root first, each with the leg this member sits
   * on. Lets "everyone on X's left leg within 7 levels" be one indexed query
   * instead of a walk down the tree.
   */
  lineage: LineageStep[];

  status: MemberStatus;
  /** When the package payment was confirmed. Bonuses start from here. */
  activatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LineageSchema = new Schema<LineageStep>(
  {
    m: { type: String, required: true },
    leg: { type: String, enum: ["left", "right"], required: true },
  },
  { _id: false }
);

const MemberSchema = new Schema<MemberDoc>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 80 },
    avatarUrl: { type: String, trim: true, maxlength: 500 },
    packageId: { type: String, enum: PACKAGE_IDS, required: true },
    memberCode: { type: String, required: true, unique: true, uppercase: true },
    passwordHash: { type: String, required: true },

    sponsorCode: { type: String, trim: true, uppercase: true, maxlength: 16, default: null },
    sponsorLeg: { type: String, enum: ["left", "right"], required: true },

    placementParent: { type: String, uppercase: true, default: null },
    position: { type: String, enum: ["left", "right"], default: null },
    depth: { type: Number, required: true, default: 0 },
    lineage: { type: [LineageSchema], default: [] },

    status: { type: String, enum: ["pending", "active", "suspended"], default: "pending" },
    activatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * One member per slot. This is what makes concurrent registrations safe:
 * if two people race for the same position, the second insert fails with a
 * duplicate-key error and the placement search runs again.
 */
MemberSchema.index(
  { placementParent: 1, position: 1 },
  { unique: true, partialFilterExpression: { placementParent: { $type: "string" } } }
);
MemberSchema.index({ sponsorCode: 1 });
MemberSchema.index({ depth: 1 });
MemberSchema.index({ "lineage.m": 1, depth: 1 });

export const Member =
  (models.Member as mongoose.Model<MemberDoc>) || model<MemberDoc>("Member", MemberSchema);

/** DHI-XXXXXX, readable over the phone: no O/0/I/1 confusion. */
export function generateMemberCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DHI-${out}`;
}
