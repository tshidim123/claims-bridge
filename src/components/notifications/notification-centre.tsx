"use client";

import Link from "next/link";
import { useState } from "react";

import { notificationCategoryLabels } from "@/config/notifications";

type NotificationItem = {
  notificationReference: string;
  type: string;
  category: string;
  title: string;
  body: string;
  priority: string;
  actionHref: string | null;
  claimReference: string | null;
  createdAt: string;
  readAt: string | null;
};

type NotificationCentreProps = {
  initialNotifications: NotificationItem[];
  initialNextCursor: string | null;
  initialUnreadCount: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function isActionRequired(notification: NotificationItem) {
  return notification.priority === "ACTION_REQUIRED";
}

export function NotificationCentre({ initialNotifications, initialNextCursor, initialUnreadCount }: NotificationCentreProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function markOne(reference: string) {
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`/api/account/notifications/${encodeURIComponent(reference)}/read`, { method: "POST" });
      if (!response.ok) throw new Error("We couldn't update that notification.");
      setNotifications((items) => items.map((item) => item.notificationReference === reference ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      setFeedback("Notification marked as read.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't update that notification.");
    }
  }

  async function markAll() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch("/api/account/notifications/read-all", { method: "POST" });
      if (!response.ok) throw new Error("We couldn't update your notifications.");
      const now = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setUnreadCount(0);
      setFeedback("All notifications marked as read.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't update your notifications.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function loadEarlier() {
    if (!nextCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    setError("");
    try {
      const response = await fetch(`/api/account/notifications?before=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
      const payload = await response.json() as { notifications?: NotificationItem[]; nextCursor?: string | null };
      if (!response.ok || !payload.notifications) throw new Error("We couldn't load earlier notifications.");
      setNotifications((items) => [...payload.notifications!, ...items]);
      setNextCursor(payload.nextCursor ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't load earlier notifications.");
    } finally {
      setLoadingEarlier(false);
    }
  }

  const sorted = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = sorted.filter((notification) => !notification.readAt);
  const earlier = sorted.filter((notification) => notification.readAt);

  return (
    <div className="notification-centre">
      <div className="notification-centre__toolbar">
        <p className="notification-centre__count" aria-live="polite">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
        <button className="button button--small button--glass" type="button" onClick={markAll} disabled={markingAll || unreadCount === 0}>
          <span className="button__label">{markingAll ? "Updating…" : "Mark all as read"}</span>
        </button>
      </div>
      {feedback && <p className="notification-centre__feedback" role="status">{feedback}</p>}
      {error && <p className="notification-centre__error" role="alert">{error}</p>}
      {notifications.length === 0 ? (
        <section className="notification-centre__empty glass-surface glass-surface--medium" aria-labelledby="notifications-empty-title">
          <div className="glass-surface__content">
            <p className="eyebrow">Notification Centre</p>
            <h2 id="notifications-empty-title">Nothing needs your attention.</h2>
            <p>Important changes to your claims and account will appear here when they happen. Your notification history remains separate from your claim timeline.</p>
          </div>
        </section>
      ) : (
        <>
          {unread.length > 0 && <NotificationGroup title="Unread" notifications={unread} onMarkRead={markOne} />}
          {earlier.length > 0 && <NotificationGroup title="Earlier" notifications={earlier} onMarkRead={markOne} />}
          {nextCursor && <button className="button button--small button--quiet notification-centre__load" type="button" onClick={loadEarlier} disabled={loadingEarlier}><span className="button__label">{loadingEarlier ? "Loading earlier notifications…" : "Load earlier notifications"}</span></button>}
        </>
      )}
    </div>
  );
}

function NotificationGroup({ title, notifications, onMarkRead }: { title: string; notifications: NotificationItem[]; onMarkRead: (reference: string) => void }) {
  return (
    <section className="notification-group" aria-labelledby={`notification-group-${title.toLowerCase()}`}>
      <div className="notification-group__heading"><p className="eyebrow" id={`notification-group-${title.toLowerCase()}`}>{title}</p><span>{notifications.length} {notifications.length === 1 ? "notice" : "notices"}</span></div>
      <ol className="notification-list">
        {notifications.map((notification) => (
          <li key={notification.notificationReference}>
            <article className={`notification-item ${notification.readAt ? "is-read" : "is-unread"} ${isActionRequired(notification) ? "is-action-required" : ""}`}>
              <div className="notification-item__node" aria-hidden="true" />
              <div className="notification-item__content">
                <div className="notification-item__topline"><span>{notificationCategoryLabels[notification.category as keyof typeof notificationCategoryLabels] ?? notification.category}</span><time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time></div>
                <h2>{notification.title}</h2>
                <p>{notification.body}</p>
                <div className="notification-item__footer">
                  <span className="notification-item__state">{notification.readAt ? "Read" : "Unread"}{isActionRequired(notification) ? " · Action may be required" : ""}</span>
                  {notification.actionHref && <Link className="text-link" href={`/api/account/notifications/${encodeURIComponent(notification.notificationReference)}/open`}>Open {notification.claimReference ? `claim ${notification.claimReference}` : "notice"}<span aria-hidden="true">→</span></Link>}
                  {!notification.readAt && <button className="notification-item__mark" type="button" onClick={() => onMarkRead(notification.notificationReference)}>Mark as read</button>}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
