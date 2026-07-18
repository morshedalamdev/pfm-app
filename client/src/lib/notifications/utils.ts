import type { Route } from "next";
import type { Notification } from "@/lib/notifications/types";

function payloadId(notification: Notification, key: string): string | null {
  const value = notification.payload[key];
  return typeof value === "string" && value ? value : null;
}

export function notificationHref(notification: Notification): Route | null {
  const transactionId = payloadId(notification, "transaction_id");
  if (transactionId) return `/transaction/${encodeURIComponent(transactionId)}` as Route;
  const recurringId = payloadId(notification, "recurring_rule_id");
  if (recurringId) return `/transaction/recurring/${encodeURIComponent(recurringId)}` as Route;
  if (payloadId(notification, "budget_id")) return "/budget" as Route;
  return null;
}
