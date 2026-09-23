import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { currentMember, signValue, verifyValue } from "./auth";
import { connectToDatabase, dbConfigured } from "./mongodb";
import type { MemberDoc } from "./models";
import { BusinessError } from "./services/tx";
import { allow, clientIp } from "./services/rateLimit";

/**
 * Shared plumbing for route handlers: one error shape, auth guards, and
 * rate limits, so every endpoint validates and fails the same way.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string>
  ) {
    super(message);
  }
}

type Handler = (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export function route(fn: Handler): Handler {
  return async (request, ctx) => {
    if (!dbConfigured) {
      return NextResponse.json({ error: "La base de données n'est pas configurée (MONGODB_URI)." }, { status: 503 });
    }
    try {
      await connectToDatabase();
      return await fn(request, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, errors: err.errors }, { status: err.status });
      }
      if (err instanceof BusinessError) {
        return NextResponse.json(
          { error: err.message, errors: err.errors ?? (err.field ? { [err.field]: err.message } : undefined) },
          { status: err.status }
        );
      }
      console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed`, err);
      return NextResponse.json({ error: "Une erreur est survenue. Réessayez dans un instant." }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object") throw new Error();
    return data as T;
  } catch {
    throw new HttpError(400, "Corps JSON invalide.");
  }
}

export async function requireMember(): Promise<MemberDoc> {
  const m = await currentMember();
  if (!m) throw new HttpError(401, "Connectez-vous pour continuer.");
  if (m.status === "suspended") throw new HttpError(403, "Ce compte est suspendu.");
  return m;
}

export async function rateLimit(request: Request, name: string, limit: number, windowSeconds: number) {
  const ok = await allow(`${name}:${clientIp(request)}`, limit, windowSeconds);
  if (!ok) throw new HttpError(429, "Trop de tentatives. Patientez un instant.");
}

export const intParam = (v: string | null, fallback: number, max = 1_000_000) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

/* ---- Admin sessions ----------------------------------------------------- */

const ADMIN_COOKIE = "dhi_admin";
const ADMIN_TTL = 60 * 60 * 12;

export async function startAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signValue("admin", { role: "admin" }, ADMIN_TTL), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_TTL,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  const jar = await cookies();
  return verifyValue<{ role: string }>("admin", jar.get(ADMIN_COOKIE)?.value)?.role === "admin";
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new HttpError(401, "Accès réservé à l'administration.");
  return "admin";
}

/* ---- Carts and affiliate cookies --------------------------------------- */

const CART_COOKIE = "dhi_cart";
export const AFFILIATE_COOKIE = "dhi_aff";
export const VISITOR_COOKIE = "dhi_vid";

/** A member's cart is keyed to them; a guest's to a random cookie. */
export async function cartOwner(create = true): Promise<string | null> {
  const member = await currentMember();
  if (member) return `m:${member.memberCode}`;
  const jar = await cookies();
  let id = jar.get(CART_COOKIE)?.value;
  if (!id || !/^[A-Za-z0-9_-]{16,40}$/.test(id)) {
    if (!create) return null;
    id = randomBytes(16).toString("base64url");
    jar.set(CART_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return `g:${id}`;
}

export async function guestCartOwner() {
  const id = (await cookies()).get(CART_COOKIE)?.value;
  return id ? `g:${id}` : null;
}

export type AffiliateCookie = { member: string; click: string };

export async function readAffiliate(): Promise<AffiliateCookie | null> {
  return verifyValue<AffiliateCookie>("affiliate", (await cookies()).get(AFFILIATE_COOKIE)?.value);
}
