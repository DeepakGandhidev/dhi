import { randomBytes } from "node:crypto";

// Each test file gets its own database, so files can run in parallel.
// Must run before any module that reads MONGODB_URI is imported.
const base = process.env.TEST_MONGO_BASE!;
const url = new URL(base);
url.pathname = `/dhi_test_${randomBytes(4).toString("hex")}`;
process.env.MONGODB_URI = url.toString();
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret";
