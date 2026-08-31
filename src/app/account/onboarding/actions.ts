"use server";
import { auth } from "@clerk/nextjs/server";
import { upsertClientProfile } from "@/lib/clients/repository";
import { onboardingSchema } from "@/lib/clients/validation";
import { redeemHandoff } from "@/lib/eligibility/persistence/repository";
import { convertLeadForClient } from "@/lib/leads/service";
export type OnboardingActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };
export async function saveOnboarding(_previous: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  if (!process.env.DATABASE_URL || !process.env.CLERK_SECRET_KEY) return { ok: false, message: "Onboarding is not configured yet." };
  const { userId } = await auth();
  if (!userId) return { ok: false, message: "Please sign in before continuing." };
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) { const fieldErrors: Record<string, string> = {}; for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message; return { ok: false, fieldErrors }; }
  try { await upsertClientProfile(userId, parsed.data); const lead = formData.get("lead"); if (typeof lead === "string" && lead) await convertLeadForClient(userId, lead); else { const handoff = formData.get("handoff"); if (typeof handoff === "string" && handoff) await redeemHandoff(userId, handoff); } return { ok: true, message: "Your client profile is saved." }; }
  catch (error) { if (error instanceof Error && error.name === "DatabaseConfigurationError") return { ok: false, message: "Onboarding is temporarily unavailable while database configuration is completed." }; return { ok: false, message: "We could not save your details. Please try again." }; }
}
