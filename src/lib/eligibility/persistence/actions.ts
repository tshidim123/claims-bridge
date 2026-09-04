"use server";
import { auth } from "@clerk/nextjs/server";
import { enqueueEmail } from "@/lib/communications/email";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import { getClientProfileByClerkId } from "@/lib/clients/repository";
import { createAnonymousHandoff, persistAssessmentForClient } from "./repository";
import { assessmentPayloadSchema } from "./validation";

export async function secureAssessmentHandoff(payload: unknown) {
  const parsed = assessmentPayloadSchema.safeParse(payload);
  if (!parsed.success) return { kind: "error" as const, message: "This assessment could not be prepared safely." };
  try {
    const { userId } = await auth();
    if (!userId) return { kind: "handoff" as const, token: await createAnonymousHandoff(parsed.data) };
    try {
      const assessment = await persistAssessmentForClient(userId, parsed.data);
      const profile = await getClientProfileByClerkId(userId);
      if (profile && parsed.data.status === "complete") {
        const outcome = buildAssessmentOutcome(parsed.data.answers);
        await enqueueEmail({ event: "ASSESSMENT_RECEIVED", recipient: { mode: "DEFERRED", recipientType: "CLIENT", recipientReference: profile.clientReference }, payload: { assessmentReference: assessment.assessmentReference, outcome: outcome.headline, explanation: outcome.explanation, evidence: outcome.evidence.map(({ label, description }) => ({ label, description })), continuationUrl: `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/account/assessment` }, dedupeKey: `ASSESSMENT_RECEIPT:${assessment.assessmentReference}` });
      }
      return { kind: "saved" as const };
    } catch (error) {
      if (error instanceof Error && error.message === "Client profile not found.") return { kind: "handoff" as const, token: await createAnonymousHandoff(parsed.data) };
      throw error;
    }
  } catch { return { kind: "error" as const, message: "We could not prepare the secure handoff. Please try again." }; }
}
