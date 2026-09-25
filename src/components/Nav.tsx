"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./Logo";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/packages", label: "Packages" },
  { href: "/plan", label: "The plan" },
  { href: "/calculator", label: "Calculator" },
  { href: "/awards", label: "Awards" },
  { href: "/produits", label: "Products" },
  { href: "/about", label: "About us" },
  { href: "/marketplace", label: "Marketplace" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // Checked on the client so the marketing pages stay statically rendered.
  useEffect(() => {
    let live = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => live && setSignedIn(Boolean(d.signedIn)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname]);

  return (
    <nav className={styles.nav} aria-label="Main">
      <div className={`shell ${styles.inner}`}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <Wordmark size={30} />
          <span className={styles.brandSub}>International</span>
        </Link>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <div id="nav-links" className={styles.links} data-open={open}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.link}
              data-current={pathname === l.href}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {signedIn ? (
            <Link href="/dashboard" className="btn btn--ink" onClick={() => setOpen(false)}>
              My network
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={styles.link}
                data-current={pathname === "/login"}
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
              <Link href="/join" className="btn btn--ink" onClick={() => setOpen(false)}>
                Join DHI
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
