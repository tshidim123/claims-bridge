import { desc, eq } from "drizzle-orm";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getDb } from "@/lib/db";
import { staffNotifications } from "@/lib/db/schema/communications";
import { getCurrentStaffContext } from "@/lib/staff/request";
import { getStaffRecordByClerkId } from "@/lib/staff/authorization";
import { auth } from "@clerk/nextjs/server";
export const metadata = { title: "Notifications", robots: { index: false, follow: false } };
export default async function StaffNotificationsPage() { const context = await getCurrentStaffContext(); const { userId } = await auth(); if (!context?.permissions.includes("NOTIFICATIONS_VIEW") || !userId) return <AdminAccessDenied forbidden />; const staff = await getStaffRecordByClerkId(userId); if (!staff) return <AdminAccessDenied forbidden />; const rows = await getDb().select().from(staffNotifications).where(eq(staffNotifications.staffUserId, staff.id)).orderBy(desc(staffNotifications.createdAt)).limit(100); return <div className="admin-page"><AdminPageHeader eyebrow="Operations / notifications" title="Your notifications" description="Operational alerts are scoped to your active staff role and preferences." /><ol className="admin-notification-list">{rows.map((row) => <li key={row.notificationReference}><a href={row.destination}><strong>{row.title}</strong><span>{row.body}</span><small>{row.createdAt.toLocaleString("en-GB")}{row.readAt ? " · Read" : " · Unread"}</small></a></li>)}</ol>{!rows.length && <p>No notifications yet.</p>}</div>; }
