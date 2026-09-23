/**
 * Demonstration data. Everything written here is flagged `demo: true` (or,
 * for members, uses the +000 demo phone range) so it can be told apart from
 * real data and removed in one command.
 *
 *   npm run db:seed                    categories + example products
 *   npm run db:seed -- --network       …plus a demo network with activity (dev only)
 *   npm run db:seed -- --remove        delete demo products and categories
 */
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb";
import { Category, Member, Product } from "../src/lib/models";
import { DEMO_CATEGORIES, DEMO_PRODUCTS, seedDemoCatalog } from "../src/lib/demoCatalog";
import { hashPassword } from "../src/lib/auth";
import { activateMember, registerMember } from "../src/lib/services/members";
import type { PackageId } from "../src/lib/plan";

async function seedCatalogue() {
  await seedDemoCatalog();
  console.log(`catalogue: ${DEMO_CATEGORIES.length} categories, ${DEMO_PRODUCTS.length} demo products`);
}

async function seedNetwork() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a demo network in production.");
  if (await Member.exists({})) {
    console.log("network: members already exist, skipping demo network");
    return;
  }
  const passwordHash = await hashPassword("demo-password");
  let n = 0;
  const add = async (sponsor: string | undefined, leg: "left" | "right", pkg: PackageId, activate = true) => {
    n++;
    const m = await registerMember({
      fullName: `Démo Membre ${n}`,
      phone: `+000 ${String(n).padStart(6, "0")}`,
      passwordHash,
      packageId: pkg,
      sponsorLeg: leg,
      sponsorCode: sponsor,
    });
    if (activate) await activateMember(m.memberCode, "seed");
    return m.memberCode;
  };

  const root = await add(undefined, "left", "thumb");
  const pkgs: PackageId[] = ["little", "index", "ring", "middle", "thumb"];
  let frontier = [root];
  for (let level = 0; level < 4; level++) {
    const next: string[] = [];
    for (const [i, code] of frontier.entries()) {
      next.push(await add(code, "left", pkgs[(i + level) % 5]));
      next.push(await add(code, "right", pkgs[(i + level + 2) % 5], i % 3 !== 2));
    }
    frontier = next;
  }
  console.log(`network: ${n} demo members, root ${root} (password: demo-password)`);
}

async function main() {
  await connectToDatabase();
  if (process.argv.includes("--remove")) {
    const p = await Product.deleteMany({ demo: true });
    const c = await Category.deleteMany({ demo: true });
    console.log(`removed ${p.deletedCount} demo products, ${c.deletedCount} demo categories`);
  } else {
    await seedCatalogue();
    if (process.argv.includes("--network")) await seedNetwork();
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
