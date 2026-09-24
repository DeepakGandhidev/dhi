import mongoose, { Schema, models, model } from "mongoose";
import { isPv } from "../money";

/* ---- Catalogue ---------------------------------------------------------- */

export interface CategoryDoc {
  _id: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  order: number;
  /** Seeded demonstration data, removable in one query before launch. */
  demo: boolean;
}

const CategorySchema = new Schema<CategoryDoc>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, default: 0 },
    demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Category =
  (models.Category as mongoose.Model<CategoryDoc>) ||
  model<CategoryDoc>("Category", CategorySchema);

export interface ProductDoc {
  _id: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  category: string; // category slug
  summary: string;
  description: string;
  images: string[];
  price: number; // FCFA, public price
  stock: number;
  /** PV credited to a member buyer per unit. Feeds their upline's binary legs. */
  pv: number;
  /** Affiliate rate for this product; null uses the plan default. */
  affiliateBps: number | null;
  characteristics: string[];
  delivery: string;
  warranty: string;
  returns: string;
  status: "active" | "draft";
  demo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDoc>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, required: true, index: true },
    summary: { type: String, default: "", maxlength: 300 },
    description: { type: String, default: "", maxlength: 5000 },
    images: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0, validate: Number.isInteger },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
    pv: { type: Number, default: 0, min: 0, validate: isPv },
    affiliateBps: { type: Number, default: null, min: 0, max: 10_000 },
    characteristics: { type: [String], default: [] },
    delivery: { type: String, default: "" },
    warranty: { type: String, default: "" },
    returns: { type: String, default: "" },
    status: { type: String, enum: ["active", "draft"], default: "active" },
    demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ProductSchema.index({ name: "text", summary: "text" });
ProductSchema.index({ status: 1, category: 1, createdAt: -1 });

export const Product =
  (models.Product as mongoose.Model<ProductDoc>) || model<ProductDoc>("Product", ProductSchema);

/* ---- Cart --------------------------------------------------------------- */

export interface CartDoc {
  /** "m:DHI-XXXXXX" for a member, "g:<random>" for a guest cookie. */
  owner: string;
  items: { product: mongoose.Types.ObjectId; qty: number }[];
  updatedAt: Date;
}

const CartSchema = new Schema<CartDoc>(
  {
    owner: { type: String, required: true, unique: true },
    items: {
      type: [
        new Schema(
          {
            product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
            qty: { type: Number, required: true, min: 1, max: 99 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const Cart = (models.Cart as mongoose.Model<CartDoc>) || model<CartDoc>("Cart", CartSchema);

/* ---- Orders ------------------------------------------------------------- */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type OrderItem = {
  product: mongoose.Types.ObjectId | null;
  slug: string;
  name: string;
  unitPrice: number;
  qty: number;
  discountBps: number;
  discount: number;
  lineTotal: number;
  pv: number;
  affiliateBps: number;
};

export interface OrderDoc {
  _id: mongoose.Types.ObjectId;
  number: string;
  kind: "package" | "marketplace";
  buyer: string | null;
  guest?: { name: string; phone: string; email?: string } | null;
  shipping?: { address: string; city: string; notes?: string } | null;
  packageId?: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  pvTotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "mobile_money" | "cash_on_delivery" | "bank_transfer";
  paymentRef?: string | null;
  affiliate?: { member: string; click: string | null } | null;
  history: { status: string; at: Date; by?: string; note?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    slug: String,
    name: String,
    unitPrice: Number,
    qty: Number,
    discountBps: Number,
    discount: Number,
    lineTotal: Number,
    pv: Number,
    affiliateBps: Number,
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDoc>(
  {
    number: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["package", "marketplace"], required: true },
    buyer: { type: String, default: null },
    guest: {
      type: new Schema({ name: String, phone: String, email: String }, { _id: false }),
      default: null,
    },
    shipping: {
      type: new Schema({ address: String, city: String, notes: String }, { _id: false }),
      default: null,
    },
    packageId: { type: String, default: null },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    discount: { type: Number, required: true },
    total: { type: Number, required: true },
    pvTotal: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    paymentMethod: {
      type: String,
      enum: ["mobile_money", "cash_on_delivery", "bank_transfer"],
      required: true,
    },
    paymentRef: { type: String, default: null },
    affiliate: {
      type: new Schema({ member: String, click: String }, { _id: false }),
      default: null,
    },
    history: {
      type: [
        new Schema(
          { status: String, at: { type: Date, default: Date.now }, by: String, note: String },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ "affiliate.member": 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
// One package order per member.
OrderSchema.index(
  { buyer: 1, kind: 1 },
  { unique: true, partialFilterExpression: { kind: "package" } }
);

export const Order =
  (models.Order as mongoose.Model<OrderDoc>) || model<OrderDoc>("Order", OrderSchema);

/* ---- Affiliate clicks --------------------------------------------------- */

export interface AffiliateClickDoc {
  _id: mongoose.Types.ObjectId;
  affiliate: string;
  product: string; // slug
  visitor: string; // hashed visitor cookie
  ipHash: string;
  /** A repeat from the same visitor inside the window: stored, not counted. */
  duplicate: boolean;
  createdAt: Date;
}

const AffiliateClickSchema = new Schema<AffiliateClickDoc>(
  {
    affiliate: { type: String, required: true },
    product: { type: String, required: true },
    visitor: { type: String, required: true },
    ipHash: { type: String, required: true },
    duplicate: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
AffiliateClickSchema.index({ affiliate: 1, createdAt: -1 });
AffiliateClickSchema.index({ affiliate: 1, product: 1, visitor: 1, createdAt: -1 });

export const AffiliateClick =
  (models.AffiliateClick as mongoose.Model<AffiliateClickDoc>) ||
  model<AffiliateClickDoc>("AffiliateClick", AffiliateClickSchema);

/* ---- Reviews ------------------------------------------------------------ */

export interface ReviewDoc {
  _id: mongoose.Types.ObjectId;
  product: string; // slug
  member: string;
  memberName: string;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

const ReviewSchema = new Schema<ReviewDoc>(
  {
    product: { type: String, required: true },
    member: { type: String, required: true },
    memberName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    body: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);
ReviewSchema.index({ product: 1, member: 1 }, { unique: true });
ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });

export const Review =
  (models.Review as mongoose.Model<ReviewDoc>) || model<ReviewDoc>("Review", ReviewSchema);
