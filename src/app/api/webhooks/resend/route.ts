import { Webhook } from "svix";
import { recordResendDeliveryEvent } from "@/lib/communications/webhook";

export const runtime = "nodejs";
const MAX_BODY = 128_000;
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET; const id = request.headers.get("svix-id"); const timestamp = request.headers.get("svix-timestamp"); const signature = request.headers.get("svix-signature");
  if (!secret || !id || !timestamp || !signature) return new Response("Invalid webhook", { status: 400 });
  const body = await request.text(); if (body.length > MAX_BODY) return new Response("Payload too large", { status: 413 });
  try { const event = new Webhook(secret).verify(body, { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": signature }) as unknown as { type?: string; created_at?: string; data?: { email_id?: string; to?: string[] } }; await recordResendDeliveryEvent(id, event); return Response.json({ ok: true }); } catch { return new Response("Invalid webhook", { status: 400 }); }
}
