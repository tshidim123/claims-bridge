import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { markAllNotificationsRead } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to update notifications." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  try {
    const updated = await markAllNotificationsRead(userId);
    return NextResponse.json({ updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "We couldn't update your notifications." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
