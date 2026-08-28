"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { ClientProfileServiceError, updateClientOperationalProfile } from "@/lib/clients/admin-service";

export type ClientCorrectionState = { ok: boolean; message?: string };

function message(error: unknown) {
  if (error instanceof ClientProfileServiceError) {
    if (error.code === "STALE") return error.message;
    if (error.code === "NOT_FOUND") return "That client record is no longer available.";
    if (error.code === "INVALID_REFERENCE" || error.code === "INVALID_VALUE") return "Check the client details and try again.";
  }
  return "We could not update the client details. Please review the current record and try again.";
}

export async function updateClientOperationalProfileAction(_previous: ClientCorrectionState, formData: FormData): Promise<ClientCorrectionState> {
  const { userId } = await auth();
  const clientReference = formData.get("clientReference"); const expectedUpdatedAt = formData.get("expectedUpdatedAt"); const firstName = formData.get("firstName"); const lastName = formData.get("lastName"); const phone = formData.get("phone"); const preferredContactMethod = formData.get("preferredContactMethod");
  if (!userId || typeof clientReference !== "string" || typeof expectedUpdatedAt !== "string" || typeof firstName !== "string" || typeof lastName !== "string" || (phone !== null && typeof phone !== "string") || (preferredContactMethod !== "email" && preferredContactMethod !== "phone")) return { ok: false, message: "Check the client details and try again." };
  try { await updateClientOperationalProfile({ actorClerkUserId: userId, clientReference, expectedUpdatedAt, firstName, lastName, phone, preferredContactMethod }); revalidatePath(`/admin/clients/${encodeURIComponent(clientReference)}`); revalidatePath("/admin/clients"); return { ok: true, message: "Client details updated." }; } catch (error) { return { ok: false, message: message(error) }; }
}
