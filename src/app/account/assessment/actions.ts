"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ClaimDomainError, createClaimFromAssessmentReference } from "@/lib/claims/repository";
import { ASSESSMENT_REFERENCE_PATTERN } from "@/lib/eligibility/persistence/reference";

const inputSchema = z.object({ assessmentReference: z.string().regex(ASSESSMENT_REFERENCE_PATTERN) });

export type CreateClaimActionState = { ok: boolean; message?: string };

export async function startClaimFromAssessment(_previous: CreateClaimActionState, formData: FormData): Promise<CreateClaimActionState> {
  if (!process.env.DATABASE_URL) return { ok: false, message: "Claims are temporarily unavailable while database configuration is completed." };

  const { userId } = await auth();
  if (!userId) return { ok: false, message: "Please sign in before continuing." };

  const parsed = inputSchema.safeParse({ assessmentId: formData.get("assessmentId") });
  if (!parsed.success) return { ok: false, message: "This assessment could not be identified. Please refresh and try again." };

  let claim;
  try {
    claim = await createClaimFromAssessmentReference(userId, parsed.data.assessmentReference);
  } catch (error) {
    if (error instanceof ClaimDomainError) {
      if (error.code === "ASSESSMENT_NOT_COMPLETE") return { ok: false, message: "Please complete the assessment before starting a claim." };
      if (error.code === "ASSESSMENT_NOT_FOUND") return { ok: false, message: "That assessment is not available on this account." };
      return { ok: false, message: "Please complete your client profile before starting a claim." };
    }
    return { ok: false, message: "We could not start your claim. Please try again." };
  }

  redirect(`/account/claims/${encodeURIComponent(claim.claimReference)}`);
}
