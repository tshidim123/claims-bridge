import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { NotificationCentre } from "@/components/notifications/notification-centre";
import { serializeNotification, getNotificationsForClient } from "@/lib/notifications/repository";

export const metadata = { title: "Notifications" };

export default async function AccountNotificationsPage() {
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/account/notifications")}`);
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Notifications unavailable" description="Notifications are temporarily unavailable while account data is configured." /></div>;
  let result: Awaited<ReturnType<typeof getNotificationsForClient>> | undefined;
  try {
    result = await getNotificationsForClient(userId);
  } catch { result = undefined; }
  if (!result) return <div className="account-page"><AccountPageHeader title="Notifications unavailable" description="We couldn't load your notifications just now. Please try again shortly." /></div>;
  return <div className="account-page notifications-page"><AccountPageHeader eyebrow="Client portal" title="Notification Centre" description="A quiet record of meaningful changes to your Claims Bridge claims and account. Notifications are separate from the case timeline." /><NotificationCentre initialNotifications={result.notifications.map(serializeNotification)} initialNextCursor={result.nextCursor} initialUnreadCount={result.unreadCount} /></div>;
}
