import { NextResponse } from "next/server";
import { HttpError, body, cartOwner, rateLimit, readAffiliate, route } from "@/lib/api";
import { currentMember } from "@/lib/auth";
import { placeOrder } from "@/lib/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Checkout. The cart, prices, discount, PV and affiliate are all read on the
 * server; the body only carries delivery and contact details.
 */
export const POST = route(async (request) => {
  await rateLimit(request, "checkout", 20, 3600);
  const b = await body<Record<string, unknown>>(request);
  const me = await currentMember();
  const errors: Record<string, string> = {};

  const address = String(b.address ?? "").trim();
  const city = String(b.city ?? "").trim();
  if (address.length < 4) errors.address = "Indiquez l'adresse de livraison.";
  if (city.length < 2) errors.city = "Indiquez la ville.";

  let guest = null;
  if (!me) {
    const name = String(b.name ?? "").trim();
    const phone = String(b.phone ?? "").trim();
    const email = String(b.email ?? "").trim();
    if (name.length < 2) errors.name = "Indiquez votre nom.";
    if (!/^[+\d][\d\s-]{6,20}$/.test(phone)) errors.phone = "Numéro de téléphone invalide.";
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Adresse e-mail invalide.";
    guest = { name, phone, email: email || undefined };
  }
  const method = b.paymentMethod;
  if (method !== "mobile_money" && method !== "cash_on_delivery" && method !== "bank_transfer") {
    errors.paymentMethod = "Choisissez un mode de paiement.";
  }
  if (Object.keys(errors).length) throw new HttpError(422, "Vérifiez les champs.", errors);

  const affiliate = await readAffiliate();
  const order = await placeOrder({
    cartOwner: (await cartOwner())!,
    buyer: me,
    guest,
    shipping: { address, city, notes: String(b.notes ?? "").trim().slice(0, 300) || undefined },
    paymentMethod: method as "mobile_money",
    affiliate: affiliate ? { member: affiliate.member, click: affiliate.click } : null,
  });
  return NextResponse.json({ number: order.number, total: order.total, id: String(order._id) }, { status: 201 });
});
