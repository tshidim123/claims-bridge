"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { createProfileShare, revokeProfileShare } from "@/lib/clients/shares";
import { profileShareSchema } from "@/lib/clients/validation";

export async function createProfileShareAction(input: { selectedFields: string[]; duration: string }) {
  const { userId } = await auth();
  if (!userId) return { ok: false as const, message: "Please sign in before creating a share link." };
  const parsed = profileShareSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Check the sharing choices." };
  try { const result = await createProfileShare(userId, parsed.data); revalidatePath("/account/profile"); return { ok: true as const, token: result.token, expiresAt: result.expiresAt.toISOString() }; } catch { return { ok: false as const, message: "We couldn't create that share link." }; }
}

export async function revokeProfileShareAction(shareReference: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false as const, message: "Please sign in before changing share links." };
  try { await revokeProfileShare(userId, shareReference); revalidatePath("/account/profile"); return { ok: true as const }; } catch { return { ok: false as const, message: "We couldn't revoke that share link." }; }
}
