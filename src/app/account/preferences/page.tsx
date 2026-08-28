import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { notificationCategoryLabels } from "@/config/notifications";
import { getNotificationPreferencesForClient } from "@/lib/notifications/repository";

export const metadata = { title: "Preferences" };

export default async function AccountPreferencesPage() {
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/account/preferences")}`);
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Preferences unavailable" description="Preferences are temporarily unavailable while account data is configured." /></div>;
  let preferences: Awaited<ReturnType<typeof getNotificationPreferencesForClient>> | undefined;
  try {
    preferences = await getNotificationPreferencesForClient(userId);
  } catch { preferences = undefined; }
  if (!preferences) return <div className="account-page"><AccountPageHeader title="Preferences unavailable" description="We couldn't load your preferences just now. Please try again shortly." /></div>;
  return <div className="account-page preferences-page"><AccountPageHeader eyebrow="Account" title="Notification preferences" description="Choose which non-essential updates appear in your in-app Notification Centre. Essential claim communication remains enabled." /><NotificationPreferences initialPreferences={preferences.map(({ category, enabled, essential, description, defaultEnabled }) => ({ category, label: notificationCategoryLabels[category], enabled, essential, description, defaultEnabled }))} /></div>;
}
