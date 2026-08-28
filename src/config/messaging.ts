import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 5000;
export const messageBodySchema = z.object({
  body: z.string().trim().min(1, "Write a message before sending.").max(MAX_MESSAGE_LENGTH, `Messages must be ${MAX_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`),
});

export function parseMessageBody(input: unknown) {
  const result = messageBodySchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Please check your message and try again.");
  return result.data.body;
}

export const messageSenderLabels = {
  CLIENT: "You",
  CLAIMS_BRIDGE: "Claims Bridge",
  SYSTEM: "Claims Bridge update",
} as const;
