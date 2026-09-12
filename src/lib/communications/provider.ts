import "server-only";
import { z } from "zod";
import {
  developmentRecipientAllowed,
  normalizeMailbox,
  type Environment,
} from "./config";
import { workerLimits, type DeliveryResult } from "./worker-policy";

const header = z
  .string()
  .min(1)
  .max(998)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
export const providerRequestSchema = z
  .object({
    from: header,
    to: z.tuple([
      z.string().refine((value) => Boolean(normalizeMailbox(value))),
    ]),
    reply_to: header.optional(),
    subject: header,
    html: z.string().min(1).max(256_000),
    text: z.string().min(1).max(128_000),
  })
  .strict();
export type ProviderRequest = z.infer<typeof providerRequestSchema>;

/** The only outbound provider adapter. Frozen request + logical reference = stable retry. */
export async function sendProviderRequest(
  emailReference: string,
  request: ProviderRequest,
  env: Environment = process.env,
  transport: typeof fetch = fetch,
): Promise<DeliveryResult> {
  if (!env.RESEND_API_KEY)
    return { kind: "temporary", code: "PROVIDER_NOT_CONFIGURED" };
  if (
    !providerRequestSchema.safeParse(request).success ||
    !/^CB-EML-[A-F0-9]{8}$/.test(emailReference)
  )
    return { kind: "permanent", code: "INVALID_EMAIL_REQUEST" };
  if (!developmentRecipientAllowed(request.to[0], env))
    return { kind: "permanent", code: "DEVELOPMENT_RECIPIENT_BLOCKED" };
  try {
    const response = await transport("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": emailReference,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(workerLimits.providerTimeoutMs),
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      const retryable =
        response.status === 408 ||
        response.status === 409 ||
        response.status === 429 ||
        response.status >= 500;
      return {
        kind: retryable ? "temporary" : "permanent",
        code: `RESEND_${response.status}`,
      };
    }
    // Store only the provider's message identifier, never its response or error body.
    const body: unknown = await response.json();
    const accepted = z.object({ id: z.string().uuid() }).safeParse(body);
    return accepted.success
      ? { kind: "sent", id: accepted.data.id }
      : { kind: "temporary", code: "INVALID_PROVIDER_RESPONSE" };
  } catch {
    return { kind: "temporary", code: "PROVIDER_TEMPORARY_FAILURE" };
  }
}
