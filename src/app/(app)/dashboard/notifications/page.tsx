import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { listNotifications, markRead } from "@/lib/services/notifications";
import { t } from "@/i18n/fr";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHead, Pager, ui } from "@/components/portal/ui";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await currentMember();
  if (!me) redirect("/login");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const list = await listNotifications(me.memberCode, page, 25);
  // Opening the page counts as reading what is on it.
  const unreadHere = list.items.filter((n) => !n.readAt).map((n) => String(n._id));
  if (unreadHere.length) await markRead(me.memberCode, unreadHere);

  return (
    <div className={ui.page}>
      <PageHead title={t.nav.notifications} sub={`${list.total} au total`} />
      <section className={ui.card}>
        {list.items.length === 0 ? (
          <EmptyState icon="bell">{t.empty.notifications}</EmptyState>
        ) : (
          <div className={ui.list}>
            {list.items.map((n) => (
              <div key={String(n._id)} className={ui.row}>
                <div>
                  <div className={ui.rowTitle}>
                    {!n.readAt ? <span style={{ color: "var(--emerald)" }}>● </span> : null}
                    {n.link ? <Link href={n.link} style={{ color: "inherit" }}>{n.title}</Link> : n.title}
                  </div>
                  {n.body ? <div className={ui.rowMeta}>{n.body}</div> : null}
                </div>
                <div className={ui.rowMeta}>{formatDateTime(n.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
        <Pager page={page} total={list.total} perPage={25} href={(p) => `/dashboard/notifications?page=${p}`} />
      </section>
    </div>
  );
}
