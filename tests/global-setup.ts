import { MongoMemoryReplSet } from "mongodb-memory-server";

/** One replica set for the whole run: transactions need one. */
let replSet: MongoMemoryReplSet;

export async function setup() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.TEST_MONGO_BASE = replSet.getUri();
}

export async function teardown() {
  await replSet?.stop();
}
