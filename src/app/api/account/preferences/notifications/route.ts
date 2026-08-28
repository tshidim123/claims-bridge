import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { NotificationServiceError, setInAppNotificationPreference } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to update preferences." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "That preference could not be saved." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (typeof input.category !== "string" || typeof input.enabled !== "boolean") return NextResponse.json({ error: "That preference could not be saved." }, { status: 400 });
  try {
    await setInAppNotificationPreference(userId, input.category, input.enabled);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NotificationServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "We couldn't save that preference." }, { status: 503 });
  }
}
