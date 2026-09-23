/**
 * One-off, re-runnable migration for members created before the ledger:
 *   - fills in each member's placement lineage (needed for generations and
 *     binary volume)
 *   - opens a package order for any member who has none
 *   - builds every index the models declare
 *
 *   npx tsx --env-file=.env.local scripts/migrate.ts
 */
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb";
import { Member, Order, type LineageStep } from "../src/lib/models";
import { withTx } from "../src/lib/services/tx";
import { nextOrderNumber } from "../src/lib/services/counters";
import { getRules } from "../src/lib/services/rules";
import type { PackageId } from "../src/lib/plan";

async function main() {
  await connectToDatabase();
  for (const model of Object.values(mongoose.models)) await model.syncIndexes();

  const members = await Member.find()
    .sort({ depth: 1 })
    .select("memberCode placementParent position lineage packageId status")
    .lean();
  const lineage = new Map<string, LineageStep[]>();
  const ops = [];
  for (const m of members) {
    const parent = m.placementParent;
    const l: LineageStep[] =
      parent && m.position ? [...(lineage.get(parent) ?? []), { m: parent, leg: m.position }] : [];
    lineage.set(m.memberCode, l);
    if (JSON.stringify(l) !== JSON.stringify(m.lineage ?? [])) {
      ops.push({ updateOne: { filter: { memberCode: m.memberCode }, update: { $set: { lineage: l } } } });
    }
  }
  if (ops.length) await Member.bulkWrite(ops);
  console.log(`lineage: ${ops.length} of ${members.length} members updated`);

  const rules = await getRules();
  let orders = 0;
  for (const m of members) {
    if (await Order.exists({ buyer: m.memberCode, kind: "package" })) continue;
    const pkg = rules.packages[m.packageId as PackageId];
    await withTx(async (session) => {
      await Order.create(
        [
          {
            number: await nextOrderNumber(session),
            kind: "package",
            buyer: m.memberCode,
            packageId: m.packageId,
            items: [{ product: null, slug: `pack-${pkg.id}`, name: `Pack ${pkg.name}`, unitPrice: pkg.amount, qty: 1, discountBps: 0, discount: 0, lineTotal: pkg.amount, pv: pkg.pv, affiliateBps: 0 }],
            subtotal: pkg.amount,
            discount: 0,
            total: pkg.amount,
            pvTotal: pkg.pv,
            paymentMethod: "mobile_money",
            history: [{ status: "pending", at: new Date(), by: "migration" }],
          },
        ],
        { session }
      );
    });
    orders++;
  }
  console.log(`package orders: ${orders} created`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
