import { RateLimit } from "../models";

/**
 * Fixed-window rate limit stored in MongoDB, so it holds across server
 * instances. Returns true when the request is allowed.
 */
export async function allow(key: string, limit: number, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const id = `${key}:${bucket}`;
  const doc = await RateLimit.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowSeconds * 1000) } },
    { upsert: true, new: true }
  ).lean();
  return (doc?.count ?? 0) <= limit;
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
