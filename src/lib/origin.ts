import { headers } from "next/headers";

/**
 * The public origin for links members share (referral, affiliate). Uses
 * SITE_URL when set, otherwise the host the request came in on.
 */
export async function siteOrigin() {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const referralLink = (origin: string, code: string) => `${origin}/join?ref=${code}`;
export const productLink = (origin: string, slug: string, code?: string) =>
  `${origin}/marketplace/${slug}${code ? `?ref=${code}` : ""}`;
