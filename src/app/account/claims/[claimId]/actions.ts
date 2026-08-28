"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { CLAIM_REFERENCE_PATTERN } from "@/lib/claims/reference";
import { completeClientActionForClient, ClientActionError } from "@/lib/actions/repository";

export type ClientActionState = { ok: boolean; message?: string };

export async function completeClientActionAction(_previous: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const { userId } = await auth();
  const claimReference = formData.get("claimReference");
  const actionReference = formData.get("actionReference");
  if (!userId || typeof claimReference !== "string" || !CLAIM_REFERENCE_PATTERN.test(claimReference) || typeof actionReference !== "string" || !/^CB-ACT-[0-9A-F]{8}$/.test(actionReference)) return { ok: false, message: "This action could not be identified." };
  try {
    await completeClientActionForClient(userId, claimReference, actionReference);
    revalidatePath(`/account/claims/${encodeURIComponent(claimReference)}`);
    revalidatePath("/account");
    return { ok: true, message: "Action marked complete." };
  } catch (error) {
    const message = error instanceof ClientActionError && error.code === "NOT_CLIENT_COMPLETABLE" ? "This action needs Claims Bridge review." : error instanceof ClientActionError && (error.code === "INVALID_STATUS" || error.code === "CONCURRENT_CHANGE") ? "This action is no longer outstanding." : "We couldn't update this action. Please try again.";
    return { ok: false, message };
  }
}
