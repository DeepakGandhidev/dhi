import mongoose, { type ClientSession } from "mongoose";
import {
  BonusEntry,
  Cart,
  Member,
  Order,
  Product,
  type MemberDoc,
  type OrderDoc,
  type OrderItem,
  type OrderStatus,
} from "../models";
import { applyBps } from "../money";
import { formatFcfa, type PackageId } from "../plan";
import { creditPv } from "./binary";
import { notify } from "./notifications";
import { getRules, type Rules } from "./rules";
import { BusinessError, withTx } from "./tx";
import { approveBonus, recordBonus, reverseBonus } from "./wallet";
import { settleUpline } from "./settle";
import { nextOrderNumber } from "./counters";

/* ---- Pricing ------------------------------------------------------------ */

export type Buyer = Pick<MemberDoc, "memberCode" | "packageId" | "status"> | null;

/** The discount a buyer gets: their package rate if their package is active. */
export function memberDiscountBps(buyer: Buyer, rules: Rules) {
  if (!buyer || buyer.status !== "active") return 0;
  return rules.packages[buyer.packageId as PackageId].discountBps;
}

/** Pure: one line's figures from server-side price and rate. */
export function priceLine(unitPrice: number, qty: number, discountBps: number) {
  const gross = unitPrice * qty;
  const discount = applyBps(gross, discountBps);
  return { gross, discount, lineTotal: gross - discount };
}

/** Price shown for a single product to this buyer. */
export function productPriceFor(price: number, buyer: Buyer, rules: Rules) {
  const bps = memberDiscountBps(buyer, rules);
  const { discount, lineTotal } = priceLine(price, 1, bps);
  return { price, discountBps: bps, discount, finalPrice: lineTotal };
}

export async function priceItems(
  items: { product: string | mongoose.Types.ObjectId; qty: number }[],
  buyer: Buyer,
  session?: ClientSession
) {
  const rules = await getRules(session);
  const ids = items.map((i) => new mongoose.Types.ObjectId(String(i.product)));
  const products = await Product.find({ _id: { $in: ids }, status: "active" })
    .session(session ?? null)
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const bps = memberDiscountBps(buyer, rules);

  const lines: (OrderItem & { stock: number; image: string | null; category: string })[] = [];
  const problems: string[] = [];
  for (const item of items) {
    const p = byId.get(String(item.product));
    if (!p) {
      problems.push("Un produit de votre panier n'est plus disponible.");
      continue;
    }
    const qty = Math.max(1, Math.min(99, Math.floor(item.qty)));
    if (p.stock < qty) problems.push(`Stock insuffisant pour « ${p.name} » (${p.stock} disponible${p.stock > 1 ? "s" : ""}).`);
    const { discount, lineTotal } = priceLine(p.price, qty, bps);
    lines.push({
      product: p._id,
      slug: p.slug,
      name: p.name,
      unitPrice: p.price,
      qty,
      discountBps: bps,
      discount,
      lineTotal,
      pv: buyer ? p.pv * qty : 0,
      affiliateBps: p.affiliateBps ?? rules.affiliateBps,
      stock: p.stock,
      image: p.images[0] ?? null,
      category: p.category,
    });
  }
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const discount = lines.reduce((n, l) => n + l.discount, 0);
  return {
    lines,
    problems,
    subtotal,
    discount,
    total: subtotal - discount,
    pvTotal: lines.reduce((n, l) => n + l.pv, 0),
    discountBps: bps,
  };
}

/** Commission on an order: each line's own rate on what the customer paid for it. */
export function commissionFor(items: Pick<OrderItem, "lineTotal" | "affiliateBps">[]) {
  return items.reduce((n, l) => n + applyBps(l.lineTotal, l.affiliateBps), 0);
}

/* ---- Checkout ----------------------------------------------------------- */

export type CheckoutInput = {
  cartOwner: string;
  buyer: Buyer;
  guest?: { name: string; phone: string; email?: string } | null;
  shipping: { address: string; city: string; notes?: string };
  paymentMethod: OrderDoc["paymentMethod"];
  /** Already verified from the signed cookie. */
  affiliate?: { member: string; click: string | null } | null;
};

export async function placeOrder(input: CheckoutInput) {
  return withTx(async (session) => {
    const cart = await Cart.findOne({ owner: input.cartOwner }).session(session);
    if (!cart || cart.items.length === 0) throw new BusinessError("Votre panier est vide.");

    const priced = await priceItems(cart.items, input.buyer, session);
    if (priced.problems.length) throw new BusinessError(priced.problems.join(" "), 409);

    // Reserve stock; the condition makes overselling impossible.
    for (const l of priced.lines) {
      const res = await Product.updateOne(
        { _id: l.product, stock: { $gte: l.qty } },
        { $inc: { stock: -l.qty } },
        { session }
      );
      if (res.modifiedCount !== 1) throw new BusinessError(`Stock insuffisant pour « ${l.name} ».`, 409);
    }

    // Affiliate attribution: must be a real, active member, and never the buyer.
    let affiliate: CheckoutInput["affiliate"] = null;
    if (input.affiliate && input.affiliate.member !== input.buyer?.memberCode) {
      const a = await Member.findOne({ memberCode: input.affiliate.member, status: "active" })
        .select("memberCode")
        .session(session)
        .lean();
      if (a) affiliate = input.affiliate;
    }

    const [order] = await Order.create(
      [
        {
          number: await nextOrderNumber(session),
          kind: "marketplace",
          buyer: input.buyer?.memberCode ?? null,
          guest: input.buyer ? null : input.guest,
          shipping: input.shipping,
          items: priced.lines.map(({ stock: _s, image: _i, category: _c, ...l }) => l),
          subtotal: priced.subtotal,
          discount: priced.discount,
          total: priced.total,
          pvTotal: priced.pvTotal,
          paymentMethod: input.paymentMethod,
          affiliate,
          history: [{ status: "pending", at: new Date(), by: input.buyer?.memberCode ?? "guest" }],
        },
      ],
      { session }
    );

    cart.items = [];
    await cart.save({ session });

    if (input.buyer) {
      await notify(
        session,
        input.buyer.memberCode,
        "order_update",
        `Commande ${order.number} enregistrée`,
        `Total ${formatFcfa(order.total)}. Elle sera confirmée à réception du paiement.`,
        `/dashboard/commandes`
      );
    }
    return order.toObject() as OrderDoc;
  });
}

/* ---- Order lifecycle ---------------------------------------------------- */

const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const allowedNext = (s: OrderStatus) => FLOW[s];

const LABEL: Record<OrderStatus, string> = {
  pending: "en attente",
  confirmed: "confirmée",
  processing: "en préparation",
  shipped: "expédiée",
  delivered: "livrée",
  cancelled: "annulée",
  refunded: "remboursée",
};

/**
 * Moves an order along its lifecycle. The money follows the status:
 *   confirmed  payment received → buyer's PV credited, affiliate commission pending
 *   delivered  commission approved (payable)
 *   cancelled / refunded  stock restored, PV taken back, commission reversed
 */
export async function setOrderStatus(
  orderId: string,
  to: OrderStatus,
  by: string,
  opts: { paymentRef?: string; note?: string } = {}
) {
  return withTx(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order || order.kind !== "marketplace") throw new BusinessError("Commande introuvable.", 404);
    if (!FLOW[order.status].includes(to)) {
      throw new BusinessError(`Impossible de passer de « ${LABEL[order.status]} » à « ${LABEL[to]} ».`);
    }
    const from = order.status;
    const wasPaid = order.paymentStatus === "paid";

    const set: Partial<OrderDoc> = { status: to };
    if (to === "confirmed") set.paymentStatus = "paid";
    if (to === "refunded" || (to === "cancelled" && wasPaid)) set.paymentStatus = "refunded";
    if (to === "cancelled" && !wasPaid) set.paymentStatus = "failed";
    if (opts.paymentRef) set.paymentRef = opts.paymentRef;

    const updated = await Order.findOneAndUpdate(
      { _id: orderId, status: from },
      { $set: set, $push: { history: { status: to, at: new Date(), by, note: opts.note } } },
      { new: true, session }
    );
    if (!updated) throw new BusinessError("Cette commande a été modifiée entre-temps.", 409);

    if (to === "confirmed") await onPaid(updated, by, session);
    if (to === "delivered") await onDelivered(updated, by, session);
    if (to === "cancelled" || to === "refunded") await onReversed(updated, wasPaid, by, session);

    if (updated.buyer) {
      await notify(
        session,
        updated.buyer,
        "order_update",
        `Commande ${updated.number} ${LABEL[to]}`,
        to === "refunded" ? `${formatFcfa(updated.total)} vous seront remboursés.` : "",
        "/dashboard/commandes"
      );
    }
    return updated.toObject() as OrderDoc;
  });
}

async function onPaid(order: OrderDoc, by: string, session: ClientSession) {
  if (order.buyer && order.pvTotal > 0) {
    const buyer = await Member.findOne({ memberCode: order.buyer }).session(session).lean<MemberDoc>();
    await creditPv(
      {
        member: order.buyer,
        pv: order.pvTotal,
        type: "product_purchase",
        sourceType: "order",
        sourceId: String(order._id),
        key: `order:${order._id}`,
        createdBy: by,
        note: order.number,
      },
      session
    );
    if (buyer) await settleUpline(buyer, session);
  }

  if (order.affiliate?.member) {
    const rules = await getRules(session);
    const amount = commissionFor(order.items);
    const entry = await recordBonus(
      {
        member: order.affiliate.member,
        type: "AFFILIATE_COMMISSION",
        amount,
        rateBps: order.items[0]?.affiliateBps ?? rules.affiliateBps,
        status: "pending",
        sourceType: "order",
        sourceId: String(order._id),
        details: {
          order: order.number,
          click: order.affiliate.click,
          lines: order.items.map((l) => ({
            product: l.slug,
            lineTotal: l.lineTotal,
            rateBps: l.affiliateBps,
            commission: applyBps(l.lineTotal, l.affiliateBps),
          })),
          pendingReason: "order_undelivered",
          rulesVersion: rules.version,
        },
        description: `Commission sur la commande ${order.number} (${formatFcfa(order.total)})`,
        key: `affiliate:${order._id}`,
      },
      session
    );
    if (entry) {
      await notify(
        session,
        order.affiliate.member,
        "affiliate_sale",
        "Nouvelle vente via votre lien",
        `Commande ${order.number} : commission de ${formatFcfa(amount)} en attente de livraison.`,
        "/dashboard/affiliation"
      );
    }
  }
}

async function onDelivered(order: OrderDoc, by: string, session: ClientSession) {
  const commission = await BonusEntry.findOne({ key: `affiliate:${order._id}`, status: "pending" })
    .session(session)
    .lean();
  if (commission) {
    await approveBonus(String(commission._id), by, session, `Commande ${order.number} livrée`);
    await notify(
      session,
      commission.member,
      "commission_earned",
      "Commission disponible",
      `${formatFcfa(commission.amount)} sur la commande ${order.number} sont maintenant disponibles.`,
      "/dashboard/paiements"
    );
  }
}

async function onReversed(order: OrderDoc, wasPaid: boolean, by: string, session: ClientSession) {
  for (const l of order.items) {
    if (l.product) await Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } }, { session });
  }
  if (!wasPaid) return;

  if (order.buyer && order.pvTotal > 0) {
    await creditPv(
      {
        member: order.buyer,
        pv: -order.pvTotal,
        type: order.status === "refunded" ? "refund" : "cancellation",
        sourceType: "order",
        sourceId: String(order._id),
        key: `order-reversal:${order._id}`,
        createdBy: by,
        note: order.number,
      },
      session
    );
  }

  const commission = await BonusEntry.findOne({
    key: `affiliate:${order._id}`,
    status: { $in: ["pending", "approved"] },
  })
    .session(session)
    .lean();
  if (commission) {
    await reverseBonus(String(commission._id), by, session, `Commande ${order.number} ${LABEL[order.status]}`);
    await notify(
      session,
      commission.member,
      "commission_reversed",
      "Commission annulée",
      `La commande ${order.number} a été ${LABEL[order.status]} : ${formatFcfa(commission.amount)} retirés.`,
      "/dashboard/affiliation"
    );
  }
}
