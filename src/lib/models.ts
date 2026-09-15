import mongoose, { Schema, models, model } from "mongoose";

const PACKAGE_IDS = ["little", "index", "ring", "middle", "thumb"] as const;

export interface MemberDoc extends mongoose.Document {
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  packageId: (typeof PACKAGE_IDS)[number];
  leg: "left" | "right";
  sponsorCode?: string;
  memberCode: string;
  status: "pending" | "active";
  createdAt: Date;
}

const MemberSchema = new Schema<MemberDoc>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 80 },
    packageId: { type: String, enum: PACKAGE_IDS, required: true },
    leg: { type: String, enum: ["left", "right"], required: true },
    sponsorCode: { type: String, trim: true, uppercase: true, maxlength: 16 },
    memberCode: { type: String, required: true, unique: true, uppercase: true },
    status: { type: String, enum: ["pending", "active"], default: "pending" },
  },
  { timestamps: true }
);

MemberSchema.index({ sponsorCode: 1, leg: 1 });

export const Member =
  (models.Member as mongoose.Model<MemberDoc>) || model<MemberDoc>("Member", MemberSchema);

/** DHI-XXXXXX, readable over the phone: no O/0/I/1 confusion. */
export function generateMemberCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DHI-${out}`;
}
