import "server-only";
import { Webhook } from "svix";
import { z } from "zod";

const MAX_BODY_BYTES = 128_000;
const deliveryEventSchema = z.object({
  type: z.string().max(100),
  created_at: z.string().datetime({ offset: true }),
  data: z.object({ email_id: z.string().uuid() }),
});
export type ResendEvent = z.infer<typeof deliveryEventSchema>;

async function boundedBody(request: Request) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function handleResendWebhook(
  request: Request,
  persist: (id: string, event: ResendEvent) => Promise<void>,
  secret = process.env.RESEND_WEBHOOK_SECRET,
) {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!secret) return new Response("Webhook inactive", { status: 503 });
  if (!id || id.length > 200 || !timestamp || !signature)
    return new Response("Invalid webhook", { status: 400 });
  let event: ResendEvent;
  try {
    const body = await boundedBody(request);
    if (body === null)
      return new Response("Payload too large", { status: 413 });
    // Installed Svix 2.x verifies only (returns undefined). Parse the unchanged raw body AFTER verification.
    new Webhook(secret).verify(body, {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
    const verified: unknown = JSON.parse(body);
    if (
      typeof verified === "object" &&
      verified !== null &&
      "type" in verified &&
      typeof verified.type === "string" &&
      !verified.type.startsWith("email.")
    )
      return Response.json({ ok: true });
    event = deliveryEventSchema.parse(verified);
  } catch {
    return new Response("Invalid webhook", { status: 400 });
  }
  try {
    await persist(id, event);
    return Response.json({ ok: true });
  } catch {
    // Includes a webhook racing ahead of provider-ID persistence. Ask Svix to retry.
    return new Response("Delivery tracking temporarily unavailable", {
      status: 503,
    });
  }
}
