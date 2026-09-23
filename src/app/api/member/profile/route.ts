import { NextResponse } from "next/server";
import { HttpError, body, rateLimit, requireMember, route } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { Member } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const me = await requireMember();
  const { passwordHash: _p, lineage: _l, ...profile } = me as unknown as Record<string, unknown>;
  return NextResponse.json({ profile });
});

/**
 * Name, city and photo can be changed freely. Phone, email and password are
 * the keys to the account (and where payouts are sent), so changing them
 * requires the current password.
 */
export const PATCH = route(async (request) => {
  const me = await requireMember();
  await rateLimit(request, `profile:${me.memberCode}`, 20, 3600);
  const b = await body<Record<string, unknown>>(request);
  const errors: Record<string, string> = {};
  const set: Record<string, unknown> = {};

  if (b.fullName !== undefined) {
    const v = String(b.fullName).trim();
    if (v.length < 2 || v.length > 120) errors.fullName = "Nom invalide.";
    else set.fullName = v;
  }
  if (b.city !== undefined) set.city = String(b.city).trim().slice(0, 80);
  if (b.avatarUrl !== undefined) {
    const v = String(b.avatarUrl).trim();
    if (v && !/^https:\/\/[^\s]+$/.test(v)) errors.avatarUrl = "Utilisez une adresse https://.";
    else set.avatarUrl = v || null;
  }

  const sensitive = b.phone !== undefined || b.email !== undefined || b.newPassword !== undefined;
  if (sensitive) {
    const full = await Member.findOne({ memberCode: me.memberCode }).select("passwordHash").lean();
    const ok = full && (await verifyPassword(String(b.currentPassword ?? ""), full.passwordHash));
    if (!ok) throw new HttpError(403, "Mot de passe actuel incorrect.", { currentPassword: "Mot de passe actuel incorrect." });

    if (b.phone !== undefined) {
      const v = String(b.phone).trim();
      if (!/^[+\d][\d\s-]{6,20}$/.test(v)) errors.phone = "Numéro invalide.";
      else set.phone = v;
    }
    if (b.email !== undefined) {
      const v = String(b.email).trim().toLowerCase();
      if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errors.email = "Adresse e-mail invalide.";
      else set.email = v || null;
    }
    if (b.newPassword !== undefined) {
      const v = String(b.newPassword);
      if (v.length < 8 || v.length > 200) errors.newPassword = "Au moins 8 caractères.";
      else set.passwordHash = await hashPassword(v);
    }
  }

  if (Object.keys(errors).length) throw new HttpError(422, "Vérifiez les champs.", errors);
  if (Object.keys(set).length) await Member.updateOne({ memberCode: me.memberCode }, { $set: set });
  return NextResponse.json({ ok: true, updated: Object.keys(set).filter((k) => k !== "passwordHash") });
});
