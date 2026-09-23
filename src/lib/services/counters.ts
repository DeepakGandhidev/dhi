import type { ClientSession } from "mongoose";
import { Counter } from "../models";

/** Sequential, human-readable references: CMD-000042, PAY-000007. */
export async function nextReference(prefix: string, session: ClientSession) {
  const c = await Counter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  );
  return `${prefix}-${String(c!.seq).padStart(6, "0")}`;
}

export const nextOrderNumber = (session: ClientSession) => nextReference("CMD", session);
