import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Member, Product, Category } from "@/lib/models";
import { registerMember, activateMember } from "@/lib/services/members";
import { clearRulesCache, saveRules } from "@/lib/services/rules";
import { withTx } from "@/lib/services/tx";
import type { PackageId } from "@/lib/plan";

export async function freshDb() {
  await connectToDatabase();
  await mongoose.connection.dropDatabase();
  // Unique indexes must exist before the concurrency tests race on them.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  clearRulesCache();
}

export async function closeDb() {
  await mongoose.disconnect();
}

let n = 0;

/** Registers a member; bcrypt is skipped because tests never sign in. */
export async function join(
  sponsorCode: string | undefined,
  leg: "left" | "right" = "left",
  packageId: PackageId = "ring"
) {
  n += 1;
  const m = await registerMember({
    fullName: `Membre ${n}`,
    phone: `+228 90 00 ${String(n).padStart(4, "0")}`,
    passwordHash: "not-a-real-hash",
    packageId,
    sponsorLeg: leg,
    sponsorCode,
  });
  return m.memberCode;
}

export async function joinActive(
  sponsorCode: string | undefined,
  leg: "left" | "right" = "left",
  packageId: PackageId = "ring"
) {
  const code = await join(sponsorCode, leg, packageId);
  await activateMember(code, "test");
  return code;
}

export const getMember = (code: string) => Member.findOne({ memberCode: code }).lean();

export async function setRules(overrides: Record<string, unknown>) {
  await withTx((s) => saveRules(overrides, "test", s));
}

export async function makeProduct(over: Partial<{ slug: string; price: number; stock: number; pv: number; affiliateBps: number | null }> = {}) {
  await Category.updateOne({ slug: "lits" }, { $setOnInsert: { name: "Lits orthopédiques" } }, { upsert: true });
  return Product.create({
    slug: over.slug ?? `produit-${Math.random().toString(36).slice(2, 8)}`,
    name: "Lit médicalisé électrique 3 fonctions",
    category: "lits",
    price: over.price ?? 1_250_000,
    stock: over.stock ?? 5,
    pv: over.pv ?? 0,
    affiliateBps: over.affiliateBps ?? null,
  });
}
