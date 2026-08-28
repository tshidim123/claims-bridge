import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { claimStatusConfig, type ClaimStatus } from "@/config/claim-statuses";
import { getDb } from "@/lib/db";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { eligibilityAssessments } from "@/lib/db/schema/eligibility";
import { claimStatusHistory, claimTimelineEvents, claims } from "@/lib/db/schema/claims";
import { generateClaimReference } from "./reference";

const MAX_REFERENCE_ATTEMPTS = 5;

const clientClaimColumns = {
  id: claims.id,
  clientProfileId: claims.clientProfileId,
  eligibilityAssessmentId: claims.eligibilityAssessmentId,
  claimReference: claims.claimReference,
  status: claims.status,
  createdAt: claims.createdAt,
  updatedAt: claims.updatedAt,
  submittedAt: claims.submittedAt,
  closedAt: claims.closedAt,
} as const;

export class ClaimDomainError extends Error {
  constructor(public readonly code: "PROFILE_NOT_FOUND" | "ASSESSMENT_NOT_FOUND" | "ASSESSMENT_NOT_COMPLETE") {
    super(code);
    this.name = "ClaimDomainError";
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

async function getOwnedProfileId(db: ReturnType<typeof getDb>, clerkUserId: string) {
  const row = (await db.select({ id: clientProfiles.id }).from(clientProfiles).where(eq(clientProfiles.clerkUserId, clerkUserId)).limit(1))[0];
  if (!row) throw new ClaimDomainError("PROFILE_NOT_FOUND");
  return row.id;
}

export async function getClaimByAssessmentForClient(clerkUserId: string, eligibilityAssessmentId: string) {
  const db = getDb();
  const clientProfileId = await getOwnedProfileId(db, clerkUserId);
  return (await db.select(clientClaimColumns).from(claims).where(and(eq(claims.clientProfileId, clientProfileId), eq(claims.eligibilityAssessmentId, eligibilityAssessmentId))).limit(1))[0];
}

export async function createClaimFromAssessment(clerkUserId: string, eligibilityAssessmentId: string) {
  const db = getDb();
  const clientProfileId = await getOwnedProfileId(db, clerkUserId);

  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const assessment = (await tx.select().from(eligibilityAssessments).where(and(eq(eligibilityAssessments.id, eligibilityAssessmentId), eq(eligibilityAssessments.clientProfileId, clientProfileId))).limit(1))[0];
        if (!assessment) throw new ClaimDomainError("ASSESSMENT_NOT_FOUND");
        if (assessment.status !== "COMPLETE" || !assessment.completedAt) throw new ClaimDomainError("ASSESSMENT_NOT_COMPLETE");

        const existing = (await tx.select().from(claims).where(and(eq(claims.clientProfileId, clientProfileId), eq(claims.eligibilityAssessmentId, eligibilityAssessmentId))).limit(1))[0];
        if (existing) return existing;

        const now = new Date();
        const claim = (await tx.insert(claims).values({
          clientProfileId,
          eligibilityAssessmentId,
          claimReference: generateClaimReference(now),
          status: "SUBMITTED",
          createdAt: now,
          updatedAt: now,
          submittedAt: now,
        }).returning())[0];

        await tx.insert(claimStatusHistory).values({
          claimId: claim.id,
          fromStatus: null,
          toStatus: "SUBMITTED",
          eventType: "CLAIM_CREATED",
          actorType: "CLIENT",
          createdAt: now,
        });

        await tx.insert(claimTimelineEvents).values({
          claimId: claim.id,
          eventType: "CLAIM_SUBMITTED",
          title: "Claim created",
          description: "You chose to continue from your preliminary assessment. Further assessment may be required.",
          visibility: "CLIENT",
          occurredAt: now,
          createdAt: now,
        });

        return claim;
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === MAX_REFERENCE_ATTEMPTS - 1) throw error;
    }
  }

  throw new Error("Claim reference could not be generated.");
}

export async function getClaimsForClient(clerkUserId: string) {
  const db = getDb();
  const clientProfileId = await getOwnedProfileId(db, clerkUserId);
  return db.select(clientClaimColumns).from(claims).where(eq(claims.clientProfileId, clientProfileId)).orderBy(desc(claims.createdAt));
}

export async function getClaimForClient(clerkUserId: string, claimReference: string) {
  const db = getDb();
  const clientProfileId = await getOwnedProfileId(db, clerkUserId);
  const claim = (await db.select(clientClaimColumns).from(claims).where(and(eq(claims.clientProfileId, clientProfileId), eq(claims.claimReference, claimReference))).limit(1))[0];
  if (!claim) return undefined;

  const assessment = (await db.select({ id: eligibilityAssessments.id, status: eligibilityAssessments.status, completedAt: eligibilityAssessments.completedAt, preliminaryOutcome: eligibilityAssessments.preliminaryOutcome }).from(eligibilityAssessments).where(and(eq(eligibilityAssessments.id, claim.eligibilityAssessmentId), eq(eligibilityAssessments.clientProfileId, clientProfileId))).limit(1))[0];
  return { claim, assessment };
}

export async function getClaimStatusHistory(clerkUserId: string, claimReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned) return [];
  const db = getDb();
  return db.select().from(claimStatusHistory).where(eq(claimStatusHistory.claimId, owned.claim.id)).orderBy(asc(claimStatusHistory.createdAt));
}

export async function getLatestTimelineEvents(clerkUserId: string, claimReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned) return [];
  const db = getDb();
  return db.select().from(claimTimelineEvents).where(and(eq(claimTimelineEvents.claimId, owned.claim.id), eq(claimTimelineEvents.visibility, "CLIENT"))).orderBy(desc(claimTimelineEvents.occurredAt)).limit(20);
}

export async function getClaimTimelineEvents(clerkUserId: string, claimReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned) return [];
  const db = getDb();
  return db.select().from(claimTimelineEvents).where(and(eq(claimTimelineEvents.claimId, owned.claim.id), eq(claimTimelineEvents.visibility, "CLIENT"))).orderBy(asc(claimTimelineEvents.occurredAt));
}

export function getClientStatus(status: ClaimStatus) {
  return claimStatusConfig[status];
}
