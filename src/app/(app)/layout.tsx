import type { Metadata } from "next";
import { currentMember } from "@/lib/auth";
import { guestCartOwner } from "@/lib/api";
import { dbConfigured } from "@/lib/mongodb";
import { Cart } from "@/lib/models";
import { unreadCount } from "@/lib/services/notifications";
import { AppShell, type ShellMember } from "@/components/portal/AppShell";

export const metadata: Metadata = {
  title: { default: "Espace membre", template: "%s · DHI International" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** The member application: dashboard pages and the marketplace. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let member: ShellMember | null = null;
  let unread = 0;
  let cartCount = 0;

  if (dbConfigured) {
    try {
      const m = await currentMember();
      if (m) {
        member = {
          memberCode: m.memberCode,
          fullName: m.fullName,
          packageId: m.packageId,
          avatarUrl: m.avatarUrl ?? null,
          status: m.status,
        };
        unread = await unreadCount(m.memberCode);
      }
      const owner = member ? `m:${member.memberCode}` : await guestCartOwner();
      if (owner) {
        const cart = await Cart.findOne({ owner }).select("items.qty").lean();
        cartCount = cart?.items.reduce((n, i) => n + i.qty, 0) ?? 0;
      }
    } catch (err) {
      console.error("[app] could not load the shell", err);
    }
  }

  return (
    <AppShell member={member} unread={unread} cartCount={cartCount}>
      {children}
    </AppShell>
  );
}
