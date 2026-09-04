"use client";

import { useEffect, useRef, useState } from "react";

import {
  markAllNotificationsRead,
  openNotification,
} from "@/app/admin/communications-actions";

type RecentNotification = {
  notificationReference: string;
  title: string;
  body: string;
  destination: string;
  readAt: Date | null;
  createdAt: Date;
};

export function StaffNotificationBell({
  unread,
  recent,
}: {
  unread: number;
  recent: RecentNotification[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const unreadLabel = unread > 99 ? "99+" : String(unread);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="admin-notification-bell">
      <button
        ref={triggerRef}
        aria-controls="staff-notification-popover"
        aria-expanded={open}
        aria-label={
          unread
            ? `Open notifications, ${unreadLabel} unread`
            : "Open notifications, no unread notifications"
        }
        className="button button--small button--quiet"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span aria-hidden="true">●</span> Notifications
        {unread ? (
          <span aria-label={`${unreadLabel} unread`}>{unreadLabel}</span>
        ) : null}
      </button>
      {open ? (
        <section
          className="admin-notification-popover glass-surface glass-surface--strong"
          id="staff-notification-popover"
          aria-label="Recent notifications"
        >
          <div className="glass-surface__content">
            <div className="admin-notification-popover__heading">
              <strong>Notifications</strong>
              <span>{unread ? `${unreadLabel} unread` : "All caught up"}</span>
            </div>
            {recent.length ? (
              <ol>
                {recent.map((notification) => (
                  <li key={notification.notificationReference}>
                    <form action={openNotification}>
                      <input
                        type="hidden"
                        name="reference"
                        value={notification.notificationReference}
                      />
                      <button type="submit" onClick={() => setOpen(false)}>
                        <strong>{notification.title}</strong>
                        <span>{notification.body}</span>
                        <small>
                          {notification.readAt ? "Read" : "Unread"} ·{" "}
                          {new Date(notification.createdAt).toLocaleString(
                            "en-GB",
                          )}
                        </small>
                      </button>
                    </form>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No recent notifications.</p>
            )}
            <div className="admin-notification-popover__actions">
              <form action={markAllNotificationsRead}>
                <button
                  className="button button--small button--quiet"
                  type="submit"
                >
                  Mark all read
                </button>
              </form>
              <a
                className="button button--small button--primary"
                href="/admin/notifications"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
