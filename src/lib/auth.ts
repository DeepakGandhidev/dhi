import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "./mongodb";
import { Member, type MemberDoc } from "./models";

const COOKIE = "dhi_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in .env.local."
    );
  }
  return s;
}

/** Whether a usable SESSION_SECRET is present, without throwing. */
export function sessionSecretConfigured() {
  const s = process.env.SESSION_SECRET;
  return Boolean(s && s.length >= 16);
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
