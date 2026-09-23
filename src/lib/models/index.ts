import { connectToDatabase, dbConfigured } from "../mongodb";

export * from "./member";
export * from "./ledger";
export * from "./marketplace";
export * from "./system";

// Server components query models directly. Mongoose queues those queries
// until a connection exists, so open it as soon as the models load; on a
// fresh serverless instance nothing else may have connected yet. Failures
// surface on the first query rather than here.
if (dbConfigured) connectToDatabase().catch((err) => console.error("[db] connection failed", err));
