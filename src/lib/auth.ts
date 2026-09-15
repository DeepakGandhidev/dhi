import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "./mongodb";
import { Member, type MemberDoc } from "./models";

const COOKIE = "dhi_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const status = sessionSecretStatus();
  if (status !== "ok") throw new Error(sessionSecretProblem(status));
  return (process.env.SESSION_SECRET as string).trim();
}

export const MIN_SECRET_LENGTH = 16;

export type SecretStatus = "ok" | "missing" | "too-short";

/** The state of SESSION_SECRET, without throwing and without revealing it. */
export function sessionSecretStatus(): SecretStatus {
  const s = process.env.SESSION_SECRET;
  if (!s || s.trim() === "") return "missing";
  if (s.trim().length < MIN_SECRET_LENGTH) return "too-short";
  return "ok";
}

export const sessionSecretConfigured = () => sessionSecretStatus() === "ok";

/** A message that says which of the two problems it actually is. */
export function sessionSecretProblem(status: SecretStatus) {
  if (status === "too-short") {
    const length = (process.env.SESSION_SECRET ?? "").trim().length;
    return `SESSION_SECRET is set but too short (${length} characters; at least ${MIN_SECRET_LENGTH} are needed). Generate a long random value and redeploy.`;
  }
  return "SESSION_SECRET is not set on this deployment. Add it in your hosting environment variables, then redeploy — on Vercel, adding a variable does not update a deployment that is already running.";
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** value = memberCode.expiry.hmac — signed so it cannot be edited by the client. */
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function createToken(memberCode: string) {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = `${memberCode}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [memberCode, expires, mac] = parts;

  const expected = sign(`${memberCode}.${expires}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expires) < Date.now()) return null;

  return memberCode;
}

export async function startSession(memberCode: string) {
  const jar = await cookies();
  jar.set(COOKIE, createToken(memberCode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The signed-in member, or null. Read this in server components. */
export async function currentMember(): Promise<MemberDoc | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const memberCode = readToken(token);
  if (!memberCode) return null;

  await connectToDatabase();
  return Member.findOne({ memberCode }).lean<MemberDoc>();
}

export const generateSecret = () => randomBytes(32).toString("base64url");
