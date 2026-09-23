import mongoose, { Schema, models, model } from "mongoose";

/* ---- Plan configuration ------------------------------------------------- */

/**
 * Overrides for the plan defaults in plan.ts. One live document; every save
 * also writes an immutable ConfigChange so any past rate can be traced.
 */
export interface PlanConfigDoc {
  key: "current";
  version: number;
  data: Record<string, unknown>;
  updatedBy: string;
  updatedAt: Date;
}

const PlanConfigSchema = new Schema<PlanConfigDoc>(
  {
    key: { type: String, enum: ["current"], required: true, unique: true },
    version: { type: Number, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: { createdAt: false, updatedAt: true }, minimize: false }
);

export const PlanConfig =
  (models.PlanConfig as mongoose.Model<PlanConfigDoc>) ||
  model<PlanConfigDoc>("PlanConfig", PlanConfigSchema);

export interface ConfigChangeDoc {
  version: number;
  data: Record<string, unknown>;
  by: string;
  createdAt: Date;
}

const ConfigChangeSchema = new Schema<ConfigChangeDoc>(
  {
    version: { type: Number, required: true, unique: true },
    data: { type: Schema.Types.Mixed, default: {} },
    by: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false }
);

export const ConfigChange =
  (models.ConfigChange as mongoose.Model<ConfigChangeDoc>) ||
  model<ConfigChangeDoc>("ConfigChange", ConfigChangeSchema);

/* ---- Notifications ------------------------------------------------------ */

export const NOTIFICATION_TYPES = [
  "new_referral",
  "member_activated",
  "bonus_earned",
  "binary_pair",
  "award_progress",
  "award_unlocked",
  "fast_cumulation",
  "order_update",
  "affiliate_sale",
  "commission_earned",
  "commission_reversed",
  "payment_processed",
  "payment_failed",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationDoc {
  _id: mongoose.Types.ObjectId;
  member: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  readAt: Date | null;
  createdAt: Date;
}

const NotificationSchema = new Schema<NotificationDoc>(
  {
    member: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: "", maxlength: 500 },
    link: String,
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
NotificationSchema.index({ member: 1, createdAt: -1 });
NotificationSchema.index({ member: 1, readAt: 1 });

export const Notification =
  (models.Notification as mongoose.Model<NotificationDoc>) ||
  model<NotificationDoc>("Notification", NotificationSchema);

/* ---- Counters and rate limits ------------------------------------------ */

const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter =
  (models.Counter as mongoose.Model<{ _id: string; seq: number }>) ||
  model<{ _id: string; seq: number }>("Counter", CounterSchema);

/** Fixed-window counters, shared across server instances; expired by TTL. */
export interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}
const RateLimitSchema = new Schema<RateLimitDoc>({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit =
  (models.RateLimit as mongoose.Model<RateLimitDoc>) ||
  model<RateLimitDoc>("RateLimit", RateLimitSchema);
