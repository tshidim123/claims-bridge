import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { MessagingServiceError, createClientMessageForClaim, getClaimMessagesForClient, markClaimConversationReadForClient, serializeMessage } from "@/lib/messaging/repository";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof MessagingServiceError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ error: fallback }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ claimReference: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to view messages." }, { status: 401 });
  const { claimReference } = await params;
  const before = new URL(request.url).searchParams.get("before") ?? undefined;
  try {
    await markClaimConversationReadForClient(userId, claimReference);
    const result = await getClaimMessagesForClient(userId, claimReference, before);
    return NextResponse.json({ conversationStatus: result.conversation?.status ?? "OPEN", messages: result.messages.map(serializeMessage), nextCursor: result.nextCursor }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "We couldn't load messages. Please try again."); }
}

export async function POST(request: Request, { params }: { params: Promise<{ claimReference: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to send a message." }, { status: 401 });
  const { claimReference } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please write a message before sending." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  try {
    const message = await createClientMessageForClaim(userId, claimReference, { body: input.body, requestId: typeof input.requestId === "string" ? input.requestId : undefined });
    return NextResponse.json({ message: serializeMessage(message) }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "We couldn't send your message. Please try again."); }
}
