"use client";

import { useEffect, useState } from "react";
import { t } from "@/i18n/fr";
import { Icon } from "./Icon";
import s from "./ui.module.css";

/** Copies text; falls back to selecting it when the clipboard is blocked. */
export function CopyButton({ text, label = t.marketplace.copy, small }: { text: string; label?: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      window.prompt("Copiez ce lien :", text);
    }
  }
  return (
    <button
      type="button"
      className={`${s.btn} ${s.btnGhost} ${small ? s.btnSmall : ""}`}
      onClick={copy}
      aria-live="polite"
    >
      <Icon name={done ? "check" : "copy"} size={16} />
      {done ? t.marketplace.copied : label}
    </button>
  );
}

/** WhatsApp, the native share sheet where there is one, and copy. */
export function ShareButtons({ url, message }: { url: string; message: string }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <a className={s.btn} href={wa} target="_blank" rel="noopener noreferrer" style={{ background: "#1faa55" }}>
        <Icon name="whatsapp" size={18} />
        {t.marketplace.whatsapp}
      </a>
      <CopyButton text={url} />
      {canShare ? (
        <button
          type="button"
          className={`${s.btn} ${s.btnGhost}`}
          onClick={() => navigator.share({ title: "DHI International", text: message, url }).catch(() => {})}
        >
          <Icon name="share" size={16} />
          Partager
        </button>
      ) : null}
    </div>
  );
}

/** A read-only link field that selects itself on focus. */
export function LinkField({ url }: { url: string }) {
  return (
    <input
      className={s.input}
      readOnly
      value={url}
      onFocus={(e) => e.currentTarget.select()}
      aria-label="Lien"
      style={{ fontSize: "var(--t-xs)" }}
    />
  );
}
