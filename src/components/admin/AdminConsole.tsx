"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Notice, ui } from "@/components/portal/ui";
import { adminFetch } from "./useAdmin";
import { Overview } from "./Overview";
import { MembersPanel } from "./MembersPanel";
import { OrdersPanel } from "./OrdersPanel";
import { PayoutsPanel } from "./PayoutsPanel";
import { ProductsPanel } from "./ProductsPanel";
import { ReviewsPanel, AwardsPanel } from "./QueuesPanels";
import { ConfigPanel } from "./ConfigPanel";
import { LedgerPanel } from "./LedgerPanel";

const TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "members", label: "Membres" },
  { id: "orders", label: "Commandes" },
  { id: "payouts", label: "Paiements" },
  { id: "products", label: "Produits" },
  { id: "reviews", label: "Avis" },
  { id: "awards", label: "Awards" },
  { id: "ledger", label: "Registre" },
  { id: "config", label: "Configuration" },
] as const;

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={`${ui.card} ${ui.formGrid}`}
      style={{ maxWidth: 420 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await adminFetch("/api/admin/session", { method: "POST", body: { password } });
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className={ui.sectionTitle} style={{ margin: 0 }}>Administration DHI</h1>
      <label className={ui.field}>
        <span>Mot de passe administrateur</span>
        <input className={ui.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error ? <Notice tone="red">{error}</Notice> : null}
      <button className={`${ui.btn} ${ui.btnNavy}`} disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

export function AdminConsole() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.find((x) => x.id === params.get("tab"))?.id ?? "overview";
  const [inspect, setInspect] = useState<string | null>(params.get("member"));

  const go = (id: string, extra = "") => router.push(`/admin?tab=${id}${extra}`, { scroll: false });
  const openLedger = (code: string) => {
    setInspect(code);
    go("ledger", `&member=${code}`);
  };

  return (
    <div className={ui.page}>
      <div className={ui.pageHead}>
        <h1 className={ui.pageTitle}>Administration</h1>
        <button
          className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`}
          onClick={async () => {
            await adminFetch("/api/admin/session", { method: "DELETE" });
            router.refresh();
          }}
        >
          Se déconnecter
        </button>
      </div>
      <nav className={ui.tabs} aria-label="Sections">
        {TABS.map((x) => (
          <button key={x.id} type="button" className={ui.tab} data-active={x.id === tab} onClick={() => go(x.id)}>
            {x.label}
          </button>
        ))}
      </nav>
      {tab === "overview" ? <Overview go={go} /> : null}
      {tab === "members" ? <MembersPanel onInspect={openLedger} /> : null}
      {tab === "orders" ? <OrdersPanel /> : null}
      {tab === "payouts" ? <PayoutsPanel onInspect={openLedger} /> : null}
      {tab === "products" ? <ProductsPanel /> : null}
      {tab === "reviews" ? <ReviewsPanel /> : null}
      {tab === "awards" ? <AwardsPanel onInspect={openLedger} /> : null}
      {tab === "ledger" ? <LedgerPanel initial={inspect} /> : null}
      {tab === "config" ? <ConfigPanel /> : null}
    </div>
  );
}
