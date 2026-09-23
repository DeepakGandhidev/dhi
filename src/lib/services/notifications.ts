import type { ClientSession } from "mongoose";
import { Notification, type NotificationType } from "../models";

export async function notify(
  session: ClientSession | null,
  member: string,
  type: NotificationType,
  title: string,
  body = "",
  link?: string
) {
  await Notification.create([{ member, type, title, body, link }], { session: session ?? undefined });
}

export async function unreadCount(member: string) {
  return Notification.countDocuments({ member, readAt: null });
}

export async function listNotifications(member: string, page = 1, perPage = 20) {
  const [items, total, unread] = await Promise.all([
    Notification.find({ member })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Notification.countDocuments({ member }),
    unreadCount(member),
  ]);
  return { items, total, unread, page, perPage };
}

export async function markRead(member: string, ids: string[] | "all") {
  const filter = ids === "all" ? { member, readAt: null } : { member, _id: { $in: ids } };
  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
}
