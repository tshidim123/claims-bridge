import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";

import {
  markAllNotificationsRead,
  markNotificationRead,
  openNotification,
} from "@/app/admin/communications-actions";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getDb } from "@/lib/db";
import { staffNotifications } from "@/lib/db/schema/communications";
import { getStaffRecordByClerkId } from "@/lib/staff/authorization";
import { getCurrentStaffContext } from "@/lib/staff/request";

const categoryLabels = {
  ASSESSMENTS: "Assessments",
  CLAIMS: "Claims",
  MESSAGES: "Messages",
  EVIDENCE: "Evidence",
  ASSIGNMENTS: "Assignments",
  PRIORITY: "System",
} as const;

type Category = keyof typeof categoryLabels;

function safeCategory(value: string | undefined): Category | undefined {
  return value && value in categoryLabels ? (value as Category) : undefined;
}

function pageHref(page: number, category?: Category, unread?: boolean) {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  if (unread) params.set("status", "unread");
  return `/admin/notifications?${params.toString()}`;
}

export default async function StaffNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; page?: string }>;
}) {
  const context = await getCurrentStaffContext();
  const { userId } = await auth();

  if (!context?.permissions.includes("NOTIFICATIONS_VIEW") || !userId) {
    return <AdminAccessDenied forbidden />;
  }

  const staff = await getStaffRecordByClerkId(userId);
  if (!staff || staff.status !== "ACTIVE")
    return <AdminAccessDenied forbidden />;

  const query = await searchParams;
  const category = safeCategory(query.category);
  const unread = query.status === "unread";
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 20;
  const filters = [
    eq(staffNotifications.staffUserId, staff.id),
    ...(category ? [eq(staffNotifications.category, category)] : []),
    ...(unread ? [isNull(staffNotifications.readAt)] : []),
  ];
  const rows = await getDb()
    .select()
    .from(staffNotifications)
    .where(and(...filters))
    .orderBy(desc(staffNotifications.createdAt), desc(staffNotifications.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const notifications = rows.slice(0, pageSize);
  const hasNextPage = rows.length > pageSize;

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Operations / notifications"
        title="Your notifications"
        description="Operational alerts are scoped to your active staff role and preferences."
      />

      <div className="admin-control-panel">
        <form
          className="admin-inline-form"
          method="get"
          aria-label="Filter notifications"
        >
          <label htmlFor="notification-category">
            Category
            <select
              id="notification-category"
              name="category"
              defaultValue={category ?? ""}
            >
              <option value="">All notifications</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="notification-status">
            Read state
            <select
              id="notification-status"
              name="status"
              defaultValue={unread ? "unread" : ""}
            >
              <option value="">All</option>
              <option value="unread">Unread</option>
            </select>
          </label>
          <button
            className="button button--small button--primary"
            type="submit"
          >
            Apply filters
          </button>
        </form>
        <form action={markAllNotificationsRead} className="admin-inline-form">
          <button className="button button--small button--quiet" type="submit">
            Mark all as read
          </button>
        </form>
      </div>

      {notifications.length ? (
        <ol className="admin-operations-list" aria-label="Notifications">
          {notifications.map((notification) => (
            <li
              className="admin-queue-item"
              key={notification.notificationReference}
            >
              <form action={openNotification}>
                <input
                  type="hidden"
                  name="reference"
                  value={notification.notificationReference}
                />
                <button className="admin-notification-open" type="submit">
                  <span>
                    <strong>{notification.title}</strong>
                    <em>{notification.body}</em>
                  </span>
                  <span className="admin-queue-item__state">
                    {categoryLabels[notification.category as Category] ??
                      "System"}{" "}
                    · {notification.readAt ? "Read" : "Unread"}
                  </span>
                </button>
              </form>
              {!notification.readAt ? (
                <form
                  action={markNotificationRead}
                  className="admin-inline-form"
                >
                  <input
                    type="hidden"
                    name="reference"
                    value={notification.notificationReference}
                  />
                  <button
                    className="button button--small button--quiet"
                    type="submit"
                  >
                    Mark read
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <section className="admin-control-panel">
          <p className="eyebrow">Nothing waiting</p>
          <h2>
            {unread
              ? "You’re all caught up."
              : "No notifications match this view."}
          </h2>
          <p>
            New operational alerts will appear here when they are relevant to
            your role and assignments.
          </p>
        </section>
      )}

      <nav className="admin-case-navigation" aria-label="Notification pages">
        <div>
          {page > 1 ? (
            <a href={pageHref(page - 1, category, unread)}>Previous page</a>
          ) : null}
          {hasNextPage ? (
            <a href={pageHref(page + 1, category, unread)}>Next page</a>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
