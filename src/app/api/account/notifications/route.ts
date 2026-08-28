import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { NotificationServiceError, getNotificationsForClient, serializeNotification } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to view notifications." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const before = new URL(request.url).searchParams.get("before") ?? undefined;
  try {
    const result = await getNotificationsForClient(userId, before);
    return NextResponse.json({ notifications: result.notifications.map(serializeNotification), nextCursor: result.nextCursor }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NotificationServiceError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
