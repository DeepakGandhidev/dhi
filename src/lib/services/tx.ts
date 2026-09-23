import mongoose, { type ClientSession } from "mongoose";
import { connectToDatabase } from "../mongodb";

/**
 * Runs `fn` in a MongoDB transaction and retries it on transient conflicts.
 * Anything that moves PV or money goes through here, so a half-applied
 * purchase (PV credited, bonus missing) cannot be left behind.
 *
 * Transactions need a replica set. Atlas always is one; `npm run dev:db`
 * starts a single-node one locally.
 */
export async function withTx<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(
      async () => {
        result = await fn(session);
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } }
    );
    return result as T;
  } finally {
    await session.endSession();
  }
}

export class BusinessError extends Error {
  constructor(
    message: string,
    public status = 422,
    public field?: string,
    public errors?: Record<string, string>
  ) {
    super(message);
  }
}
