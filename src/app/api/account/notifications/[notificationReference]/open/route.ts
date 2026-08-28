import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveNotificationAction } from "@/config/notifications";
import { getNotificationForClient, markNotificationRead } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ notificationReference: string }> }) {
  const { userId } = await auth();
  const fallback = new URL("/account/notifications", request.url);
  if (!userId) return NextResponse.redirect(new URL(`/sign-in?redirect_url=${encodeURIComponent(fallback.pathname)}`, request.url));
  const { notificationReference } = await params;
  try {
    const notification = await getNotificationForClient(userId, notificationReference);
    if (!notification) return NextResponse.redirect(fallback);
    await markNotificationRead(userId, notificationReference);
    const destination = resolveNotificationAction(notification.actionType, notification.actionReference);
    return NextResponse.redirect(destination ? new URL(destination, request.url) : fallback);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
