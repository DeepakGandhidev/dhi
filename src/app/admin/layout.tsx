import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Logo";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration DHI" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f3f5f9" }}>
      <header style={{ background: "var(--navy)", color: "#fff" }}>
        <div style={{ width: "min(1280px, 100% - 32px)", margin: "0 auto", minHeight: 58, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/admin" style={{ color: "#fff", textDecoration: "none", display: "flex", alignItems: "baseline", gap: 10 }}>
            <Wordmark size={26} tone="#f4f5f8" />
            <span style={{ fontSize: "var(--t-xs)", color: "var(--gold)", fontWeight: 700 }}>Administration</span>
          </Link>
          <Link href="/" style={{ color: "#b9c0e6", fontSize: "var(--t-s)" }}>Voir le site</Link>
        </div>
      </header>
      <main style={{ width: "min(1280px, 100% - 32px)", margin: "0 auto", padding: "24px 0 60px" }}>{children}</main>
    </div>
  );
}
