import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { NotificationServiceError, markNotificationRead } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ notificationReference: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to update notifications." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { notificationReference } = await params;
  try {
    await markNotificationRead(userId, notificationReference);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NotificationServiceError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ error: "We couldn't update that notification." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
