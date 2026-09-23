/**
 * Starts a throwaway MongoDB on 127.0.0.1:27017 so the site can be run
 * without installing MongoDB. Data is discarded when you stop it.
 *
 * It is a single-node replica set, because every purchase, bonus and payout
 * is written in a transaction and MongoDB only allows those on a replica
 * set. Set MONGODB_URI to mongodb://127.0.0.1:27017/dhi?replicaSet=dev
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";

const mongo = await MongoMemoryReplSet.create({
  replSet: { name: "dev", count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: 27017 }],
});

console.log("\n  Dev MongoDB (replica set) ready.");
console.log("  MONGODB_URI=mongodb://127.0.0.1:27017/dhi?replicaSet=dev");
console.log("  Leave this running and start the site with: npm run dev\n");

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
