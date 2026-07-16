"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, ChevronRight, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getNotifications, getNotificationUnreadCount, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/api";
import type { Notification } from "@/lib/notifications/types";
import { notificationHref } from "@/lib/notifications/utils";

function notificationDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export function NotificationInbox() {
  const queryClient = useQueryClient(); const [unreadOnly, setUnreadOnly] = useState(false);
  const inbox = useQuery({ queryFn: () => getNotifications(unreadOnly), queryKey: ["notifications", unreadOnly], refetchInterval: 30_000 });
  const count = useQuery({ queryFn: getNotificationUnreadCount, queryKey: ["notifications", "unread-count"], refetchInterval: 30_000 });
  const read = useMutation({ mutationFn: markNotificationRead }); const readAll = useMutation({ mutationFn: markAllNotificationsRead });
  async function refresh() { await queryClient.invalidateQueries({ queryKey: ["notifications"] }); }
  async function markRead(notification: Notification) { await read.mutateAsync(notification.id); await refresh(); }
  async function allRead() { await readAll.mutateAsync(); await refresh(); }
  return <MobileShell><div className="standard-page notification-page"><PageHeader backHref={null} title="Notifications" /><section className="notification-hero"><span><BellRing aria-hidden="true" size={23} /></span><div><p className="eyebrow">INBOX</p><h2>{count.data?.unread_count ?? 0} unread</h2><p>Updates from your money activity and recurring schedules.</p></div>{(count.data?.unread_count ?? 0) > 0 ? <button disabled={readAll.isPending} onClick={() => void allRead()} type="button"><CheckCheck aria-hidden="true" size={16} />{readAll.isPending ? "Saving…" : "Read all"}</button> : null}</section><div aria-label="Notification filter" className="notification-filter-tabs"><button aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)} type="button">All</button><button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)} type="button">Unread</button></div>{inbox.isPending ? <div aria-busy="true" aria-label="Loading notifications" className="recurring-loading"><span /><span /></div> : null}{inbox.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load notifications</strong><p>{inbox.error.message}</p><button onClick={() => void inbox.refetch()} type="button">Try again</button></section> : null}{inbox.data ? <div className="notification-inbox-list">{inbox.data.items.length ? inbox.data.items.map((item) => { const href = notificationHref(item); return <article className={item.read_at ? "notification-card" : "notification-card notification-card--unread"} key={item.id}><span className={`category-icon ${item.type.includes("recurring") ? "accent-green" : "accent-purple"}`}>{item.type.includes("recurring") ? <CircleDollarSign aria-hidden="true" size={18} /> : <Bell aria-hidden="true" size={18} />}</span><div><div><strong>{item.title}</strong>{!item.read_at ? <span>New</span> : null}</div><p>{item.message}</p><small>{notificationDate(item.created_at)}</small><div className="notification-card-actions">{!item.read_at ? <button disabled={read.isPending} onClick={() => void markRead(item)} type="button">Mark read</button> : null}{href ? <Link href={href}>View details <ChevronRight aria-hidden="true" size={14} /></Link> : null}</div></div></article>; }) : <section className="notification-empty"><CheckCheck aria-hidden="true" size={24} /><strong>{unreadOnly ? "No unread notifications" : "You’re all caught up"}</strong><p>New money updates will appear here.</p></section>}</div> : null}</div></MobileShell>;
}
