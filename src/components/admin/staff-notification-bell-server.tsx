import { auth } from "@clerk/nextjs/server";

import { StaffNotificationBell } from "@/components/admin/staff-notification-bell";
import { getStaffNotificationSummary } from "@/lib/communications/staff-operations";

export async function StaffNotificationBellServer() {
  const { userId } = await auth();
  if (!userId) return null;

  let summary;
  try {
    summary = await getStaffNotificationSummary(userId);
  } catch {
    return null;
  }

  return (
    <StaffNotificationBell unread={summary.unread} recent={summary.recent} />
  );
}
