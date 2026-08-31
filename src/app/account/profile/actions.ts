"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { updateClientProfileForClient } from "@/lib/clients/repository";
import { onboardingSchema } from "@/lib/clients/validation";

export type ClientProfileActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

export async function updateClientProfile(_previous: ClientProfileActionState, formData: FormData): Promise<ClientProfileActionState> {
  const { userId } = await auth();
  if (!userId || !process.env.DATABASE_URL) return { ok: false, message: "Your profile is temporarily unavailable. Please try again shortly." };
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors };
  }
  try {
    await updateClientProfileForClient(userId, parsed.data);
    revalidatePath("/account");
    revalidatePath("/account/profile");
    return { ok: true, message: "Your profile details have been updated." };
  } catch {
    return { ok: false, message: "We couldn't update your profile. Please try again." };
  }
}
