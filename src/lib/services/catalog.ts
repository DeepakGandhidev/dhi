import mongoose from "mongoose";
import { Cart, Category, Order, Product, Review, type ProductDoc } from "../models";
import { BusinessError } from "./tx";

/* ---- Catalogue ---------------------------------------------------------- */

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: "new" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
};

export async function listProducts(query: ProductQuery) {
  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(48, Math.max(1, query.perPage ?? 12));
  const filter: Record<string, unknown> = { status: "active" };
  if (query.category) filter.category = query.category;
  const q = query.q?.trim().slice(0, 80);
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: escaped, $options: "i" } }, { summary: { $regex: escaped, $options: "i" } }];
  }
  const sort: Record<string, 1 | -1> =
    query.sort === "price_asc" ? { price: 1 } : query.sort === "price_desc" ? { price: -1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * perPage).limit(perPage).lean<ProductDoc[]>(),
    Product.countDocuments(filter),
  ]);
  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export const listCategories = () => Category.find().sort({ order: 1, name: 1 }).lean();

export const getProduct = (slug: string) =>
  Product.findOne({ slug, status: "active" }).lean<ProductDoc>();

/* ---- Reviews ------------------------------------------------------------ */

export async function reviewSummary(slug: string) {
  const [row] = await Review.aggregate([
    { $match: { product: slug, status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  return { average: row ? Math.round(row.avg * 10) / 10 : 0, count: (row?.n as number) ?? 0 };
}

export async function reviewSummaries(slugs: string[]) {
  const rows = await Review.aggregate([
    { $match: { product: { $in: slugs }, status: "approved" } },
    { $group: { _id: "$product", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  return new Map<string, { average: number; count: number }>(
    rows.map((r) => [r._id, { average: Math.round(r.avg * 10) / 10, count: r.n }])
  );
}

export const listReviews = (slug: string, limit = 20) =>
  Review.find({ product: slug, status: "approved" }).sort({ createdAt: -1 }).limit(limit).lean();

/** Only a member who received the product can review it, once. */
export async function canReview(memberCode: string, slug: string) {
  const [bought, existing] = await Promise.all([
    Order.exists({ buyer: memberCode, status: "delivered", "items.slug": slug }),
    Review.exists({ product: slug, member: memberCode }),
  ]);
  return { bought: Boolean(bought), alreadyReviewed: Boolean(existing) };
}

export async function submitReview(
  member: { memberCode: string; fullName: string },
  slug: string,
  rating: number,
  body: string
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BusinessError("Choisissez une note de 1 à 5.", 422, "rating");
  }
  const { bought, alreadyReviewed } = await canReview(member.memberCode, slug);
  if (!bought) throw new BusinessError("Seuls les acheteurs ayant reçu ce produit peuvent le noter.", 403);
  if (alreadyReviewed) throw new BusinessError("Vous avez déjà donné votre avis sur ce produit.", 409);
  return Review.create({
    product: slug,
    member: member.memberCode,
    memberName: member.fullName.split(" ")[0],
    rating,
    body: body.trim().slice(0, 2000),
    status: "pending",
  });
}

/* ---- Cart --------------------------------------------------------------- */

export async function getCart(owner: string) {
  const cart = await Cart.findOne({ owner }).lean();
  return cart?.items ?? [];
}

export async function setCartItem(owner: string, productId: string, qty: number) {
  if (!mongoose.isValidObjectId(productId)) throw new BusinessError("Produit introuvable.", 404);
  const product = await Product.findOne({ _id: productId, status: "active" }).select("stock name").lean();
  if (!product) throw new BusinessError("Produit introuvable.", 404);
  const q = Math.floor(qty);
  if (q > product.stock) throw new BusinessError(`Seulement ${product.stock} en stock.`, 409);

  const cart = (await Cart.findOne({ owner })) ?? new Cart({ owner, items: [] });
  const existing = cart.items.find((i) => String(i.product) === productId);
  if (q <= 0) cart.items = cart.items.filter((i) => String(i.product) !== productId);
  else if (existing) existing.qty = Math.min(99, q);
  else cart.items.push({ product: new mongoose.Types.ObjectId(productId), qty: Math.min(99, q) });
  await cart.save();
  return cart.items;
}

/** A guest cart becomes the member's when they sign in. */
export async function mergeCarts(from: string, into: string) {
  if (from === into) return;
  const guest = await Cart.findOne({ owner: from });
  if (!guest || guest.items.length === 0) return;
  const target = (await Cart.findOne({ owner: into })) ?? new Cart({ owner: into, items: [] });
  for (const item of guest.items) {
    const e = target.items.find((i) => String(i.product) === String(item.product));
    if (e) e.qty = Math.min(99, e.qty + item.qty);
    else target.items.push(item);
  }
  await target.save();
  await Cart.deleteOne({ owner: from });
}
