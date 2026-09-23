"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "@/i18n/fr";
import { Icon } from "@/components/portal/Icon";
import { ui } from "@/components/portal/ui";
import s from "./marketplace.module.css";

async function addToCart(productId: string, qty: number) {
  // The cart stores quantities, so add to what is already there.
  const current = await fetch("/api/marketplace/cart", { cache: "no-store" }).then((r) => r.json());
  const existing = (current.lines as { product: string; qty: number }[] | undefined)?.find((l) => l.product === productId)?.qty ?? 0;
  const res = await fetch("/api/marketplace/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, qty: existing + qty }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? t.errors.generic);
  return data;
}

/** Card button: one unit, straight into the cart. */
export function QuickAdd({ productId, disabled }: { productId: string; disabled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <>
      <button
        type="button"
        className={`${ui.btn} ${ui.btnSmall} ${ui.btnGold}`}
        disabled={disabled || state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            await addToCart(productId, 1);
            setState("done");
            router.refresh();
            setTimeout(() => setState("idle"), 1600);
          } catch (e) {
            setMsg((e as Error).message);
            setState("error");
          }
        }}
        aria-label={t.marketplace.addToCart}
      >
        <Icon name={state === "done" ? "check" : "cart"} size={16} />
        {state === "done" ? "Ajouté" : disabled ? t.marketplace.outOfStock : "Ajouter"}
      </button>
      {state === "error" ? <span className={s.inlineError} role="alert">{msg}</span> : null}
    </>
  );
}

/** Detail page: quantity, add to cart, and buy now (add then go to checkout). */
export function BuyBox({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const out = stock <= 0;

  async function go(mode: "add" | "buy") {
    setBusy(mode);
    setMsg(null);
    try {
      await addToCart(productId, qty);
      if (mode === "buy") router.push("/marketplace/commande");
      else {
        setMsg({ tone: "ok", text: "Ajouté au panier." });
        router.refresh();
      }
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={s.buyBox}>
      <div className={s.qty}>
        <span>{t.marketplace.quantity}</span>
        <div className={s.stepper}>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || out} aria-label="Diminuer">
            <Icon name="minus" size={16} />
          </button>
          <output aria-live="polite">{qty}</output>
          <button type="button" onClick={() => setQty((q) => Math.min(stock, 99, q + 1))} disabled={qty >= Math.min(stock, 99) || out} aria-label="Augmenter">
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
      <div className={s.buyActions}>
        <button type="button" className={`${ui.btn} ${ui.btnGold}`} disabled={out || busy !== null} onClick={() => go("buy")}>
          {busy === "buy" ? "…" : t.marketplace.buyNow}
        </button>
        <button type="button" className={`${ui.btn} ${ui.btnNavy}`} disabled={out || busy !== null} onClick={() => go("add")}>
          <Icon name="cart" size={16} />
          {busy === "add" ? "…" : t.marketplace.addToCart}
        </button>
      </div>
      {msg ? (
        <p className={msg.tone === "ok" ? s.inlineOk : s.inlineError} role={msg.tone === "err" ? "alert" : "status"}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
