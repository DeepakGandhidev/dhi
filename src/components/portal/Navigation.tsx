"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/i18n/fr";
import { Icon, type IconName } from "./Icon";
import s from "./AppShell.module.css";

type Item = { href: string; label: string; short?: string; icon: IconName; exact?: boolean };

/** The six primary destinations, in the order of the mobile tab bar. */
export const PRIMARY: Item[] = [
  { href: "/dashboard", label: t.nav.home, icon: "home", exact: true },
  { href: "/dashboard/reseau", label: t.nav.network, short: "Réseau", icon: "network" },
  { href: "/marketplace", label: t.nav.marketplace, short: "Boutique", icon: "store" },
  { href: "/dashboard/bonus", label: t.nav.bonus, icon: "gift" },
  { href: "/dashboard/paiements", label: t.nav.payments, short: "Paiements", icon: "wallet" },
  { href: "/dashboard/profil", label: t.nav.profile, icon: "user" },
];

export const SECONDARY: Item[] = [
  { href: "/dashboard/awards", label: t.nav.awards, icon: "trophy" },
  { href: "/dashboard/affiliation", label: t.nav.affiliate, icon: "share" },
  { href: "/dashboard/commandes", label: t.nav.orders, icon: "receipt" },
  { href: "/dashboard/notifications", label: t.nav.notifications, icon: "bell" },
];

function useActive() {
  const path = usePathname() ?? "";
  return (item: Item) => (item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`));
}

export function SideNav() {
  const isActive = useActive();
  return (
    <nav className={s.sideNav}>
      {[...PRIMARY, ...SECONDARY].map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          className={s.sideLink}
          data-active={isActive(item)}
          data-divider={i === PRIMARY.length}
          aria-current={isActive(item) ? "page" : undefined}
        >
          <Icon name={item.icon} size={20} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className={s.bottomNav} aria-label="Navigation principale">
      {PRIMARY.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={s.bottomLink}
          data-active={isActive(item)}
          aria-current={isActive(item) ? "page" : undefined}
        >
          <Icon name={item.icon} size={22} />
          <span>{item.short ?? item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Mobile drawer for the destinations that do not fit in the tab bar. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`${s.iconBtn} ${s.menuBtn}`}
        aria-expanded={open}
        aria-controls="portal-menu"
        aria-label={open ? t.nav.close : t.nav.menu}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "close" : "menu"} size={22} />
      </button>
      {open ? (
        <>
          <div className={s.scrim} onClick={() => setOpen(false)} aria-hidden="true" />
          <div id="portal-menu" className={s.drawer} role="dialog" aria-label={t.nav.menu}>
            {[...SECONDARY, ...PRIMARY.slice(1)].map((item) => (
              <Link key={item.href} href={item.href} className={s.drawerLink}>
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            ))}
            <form action="/api/auth/logout" method="post">
              <button type="submit" className={s.drawerLink}>
                <Icon name="logout" size={20} />
                {t.nav.signOut}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
