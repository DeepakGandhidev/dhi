"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/i18n/fr";
import { formatDateTime } from "@/lib/format";
import { Icon } from "./Icon";
import s from "./AppShell.module.css";

type Item = { _id: string; title: string; body: string; link?: string; readAt: string | null; createdAt: string };

/** Unread count in the header, refreshed every minute; the latest items on open. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async (perPage: number) => {
    const res = await fetch(`/api/member/notifications?perPage=${perPage}`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    return (await res.json()) as { items: Item[]; unread: number };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load(1).then((d) => setUnread(d.unread)).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    setError(false);
    load(8)
      .then((d) => {
        setItems(d.items);
        setUnread(d.unread);
      })
      .catch(() => setError(true));
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, load]);

  async function markAll() {
    await fetch("/api/member/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setItems((list) => list?.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })) ?? null);
  }

  return (
    <div className={s.bellWrap} ref={box}>
      <button
        type="button"
        className={s.iconBtn}
        aria-label={`${t.nav.notifications}${unread ? ` (${unread} non lues)` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={22} />
        {unread > 0 ? <span className={s.badge}>{unread > 99 ? "99+" : unread}</span> : null}
      </button>

      {open ? (
        <div className={s.popover} role="dialog" aria-label={t.nav.notifications}>
          <div className={s.popHead}>
            <strong>{t.nav.notifications}</strong>
            {unread > 0 ? (
              <button type="button" className={s.popAction} onClick={markAll}>
                Tout marquer comme lu
              </button>
            ) : null}
          </div>
          {error ? (
            <p className={s.popEmpty}>{t.errors.network}</p>
          ) : items === null ? (
            <p className={s.popEmpty}>Chargement…</p>
          ) : items.length === 0 ? (
            <p className={s.popEmpty}>{t.empty.notifications}</p>
          ) : (
            <ul className={s.popList}>
              {items.map((n) => (
                <li key={n._id} data-unread={!n.readAt}>
                  <Link href={n.link ?? "/dashboard/notifications"} onClick={() => setOpen(false)}>
                    <strong>{n.title}</strong>
                    {n.body ? <span>{n.body}</span> : null}
                    <time>{formatDateTime(n.createdAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/notifications" className={s.popFoot} onClick={() => setOpen(false)}>
            Tout voir
          </Link>
        </div>
      ) : null}
    </div>
  );
}
