import Link from "next/link";
import { t } from "@/i18n/fr";
import { Wordmark } from "@/components/Logo";
import { Icon } from "./Icon";
import { BottomNav, MobileMenu, SideNav } from "./Navigation";
import { NotificationBell } from "./NotificationBell";
import { PackageBadge } from "./ui";
import s from "./AppShell.module.css";

export type ShellMember = {
  memberCode: string;
  fullName: string;
  packageId: string;
  avatarUrl: string | null;
  status: string;
};

/**
 * The member application frame. Signed in: sidebar on desktop, compact
 * header and bottom navigation on mobile. A guest browsing the marketplace
 * gets the header only, with sign-in and join.
 */
export function AppShell({
  member,
  unread,
  cartCount,
  children,
}: {
  member: ShellMember | null;
  unread: number;
  cartCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className={s.app} data-guest={!member}>
      {member ? (
        <aside className={s.sidebar} aria-label="Navigation membre">
          <Link href="/dashboard" className={s.sideBrand}>
            <Wordmark size={30} tone="#f4f5f8" />
            <span>{t.brand.sub}</span>
          </Link>
          <div className={s.sideMember}>
            <Avatar member={member} size={42} />
            <div className={s.sideMemberText}>
              <strong>{member.fullName}</strong>
              <span className="num">{member.memberCode}</span>
              <PackageBadge id={member.packageId} />
            </div>
          </div>
          <SideNav />
          <form action="/api/auth/logout" method="post" className={s.sideFoot}>
            <button type="submit" className={s.sideLink}>
              <Icon name="logout" size={20} />
              {t.nav.signOut}
            </button>
          </form>
        </aside>
      ) : null}

      <div className={s.main}>
        <header className={s.header}>
          <div className={s.headerInner}>
            <Link href={member ? "/dashboard" : "/marketplace"} className={s.brand}>
              <Wordmark size={26} />
              <span className={s.brandSub}>{t.brand.sub}</span>
            </Link>
            <div className={s.actions}>
              <Link href="/marketplace/panier" className={s.iconBtn} aria-label={`${t.nav.cart} (${cartCount})`}>
                <Icon name="cart" size={22} />
                {cartCount > 0 ? <span className={s.badge}>{cartCount > 99 ? "99+" : cartCount}</span> : null}
              </Link>
              {member ? (
                <>
                  <NotificationBell initialUnread={unread} />
                  <Link href="/dashboard/profil" className={s.avatarLink} aria-label={t.nav.profile}>
                    <Avatar member={member} size={34} />
                  </Link>
                  <MobileMenu />
                </>
              ) : (
                <>
                  <Link href="/login" className={s.textLink}>
                    {t.nav.signIn}
                  </Link>
                  <Link href="/join" className={s.joinBtn}>
                    {t.nav.join}
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <main className={s.content}>{children}</main>
      </div>

      {member ? <BottomNav /> : null}
    </div>
  );
}

export function Avatar({ member, size }: { member: Pick<ShellMember, "fullName" | "avatarUrl">; size: number }) {
  const initials = member.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return member.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.avatarUrl} alt="" width={size} height={size} className={s.avatar} />
  ) : (
    <span className={s.avatar} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}
