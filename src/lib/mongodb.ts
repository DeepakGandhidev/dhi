import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Cached across hot reloads in dev and across lambda invocations in prod.
const globalWithMongo = global as typeof globalThis & { _dhiMongo?: Cached };
const cached: Cached = globalWithMongo._dhiMongo ?? { conn: null, promise: null };
globalWithMongo._dhiMongo = cached;

export const dbConfigured = Boolean(MONGODB_URI);

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and add your connection string."
    );
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
