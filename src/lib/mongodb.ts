import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Cached across hot reloads in dev and across lambda invocations in prod.
const globalWithMongo = global as typeof globalThis & { _dhiMongo?: Cached };
const cached: Cached = globalWithMongo._dhiMongo ?? { conn: null, promise: null };
globalWithMongo._dhiMongo = cached;

export const dbConfigured = Boolean(MONGODB_URI);

/**
 * The database name in a connection string, or null when it has none.
 * mongodb+srv://user:pass@host/dhi?retryWrites=true -> "dhi"
 * mongodb+srv://user:pass@host/?appName=Cluster0    -> null
 */
export function databaseNameFromUri(uri = MONGODB_URI) {
  if (!uri) return null;
  const afterHost = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  const slash = afterHost.indexOf("/");
  if (slash === -1) return null;
  const name = afterHost.slice(slash + 1).split("?")[0].trim();
  return name === "" ? null : decodeURIComponent(name);
}

/**
 * Without a database name MongoDB falls back to "test". That is shared with
 * anything else pointed at the same cluster, so it is treated as a
 * misconfiguration rather than a default.
 */
export const databaseNamed = Boolean(databaseNameFromUri());

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and add your connection string."
    );
  }
  if (!databaseNameFromUri()) {
    throw new Error(
      "MONGODB_URI has no database name, so MongoDB would default to 'test' — a database shared with anything else on the cluster. Add the database to the end of the host, before the '?': .../dhi?retryWrites=true"
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
