"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  ManualCommunicationError,
  triggerManualCommunication,
} from "@/lib/communications/manual-service";

export async function sendClientCommunication(
  raw: unknown,
): Promise<{ ok: boolean; message: string; emailReference?: string }> {
  const { userId } = await auth();
  if (!userId)
    return {
      ok: false,
      message: "Please sign in with an authorised staff account.",
    };
  try {
    const result = await triggerManualCommunication(userId, raw);
    revalidatePath("/admin/communications");
    revalidatePath("/admin/clients", "layout");
    revalidatePath("/admin/claims", "layout");
    return {
      ok: true,
      message: result.reused
        ? "This request was already recorded. Its communication reference is below."
        : "Communication recorded in the outbox. Follow its delivery status using the reference below.",
      emailReference: result.emailReference,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ManualCommunicationError
          ? error.message
          : "The communication could not be recorded. Check the current claim requirements and try again.",
    };
  }
}
