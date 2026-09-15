/**
 * Starts a throwaway MongoDB on 127.0.0.1:27017 so the site can be run
 * without installing MongoDB. Data is discarded when you stop it.
 * For real data, point MONGODB_URI at Atlas or a local mongod instead.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const mongo = await MongoMemoryServer.create({
  instance: { port: 27017, dbName: "dhi" },
});

console.log(`\n  Dev MongoDB ready at ${mongo.getUri()}dhi`);
console.log("  Leave this running and start the site with: npm run dev\n");

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
