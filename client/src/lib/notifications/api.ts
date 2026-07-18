import { getBackendJson, sendBackendJson } from "@/lib/api/client";
import type { Notification, NotificationList, NotificationMarkAllRead, NotificationUnreadCount } from "@/lib/notifications/types";

export function getNotifications(unreadOnly = false) {
  return getBackendJson<NotificationList>(`notifications?limit=100&unread_only=${unreadOnly}`, "We couldn't load your notifications.");
}
export function getNotificationUnreadCount() {
  return getBackendJson<NotificationUnreadCount>("notifications/unread-count", "We couldn't load your unread count.");
}
export function markNotificationRead(id: string) {
  return sendBackendJson<Notification>(`notifications/${encodeURIComponent(id)}/read`, "POST");
}
export function markAllNotificationsRead() {
  return sendBackendJson<NotificationMarkAllRead>("notifications/read-all", "POST");
}
