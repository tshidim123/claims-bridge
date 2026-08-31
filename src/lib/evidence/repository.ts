import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { canTransitionEvidenceRequirement, evidenceRequirementConfig, isEvidenceRequirementPriority, isEvidenceRequirementStatus, isEvidenceRequirementType, type DocumentCategory, type EvidenceRequirementPriority, type EvidenceRequirementStatus, type EvidenceRequirementType } from "@/config/evidence";
import { getDb } from "@/lib/db";
import { claimEvidenceRequirements, claimDocuments } from "@/lib/db/schema/evidence";
import { claimTimelineEvents, claims } from "@/lib/db/schema/claims";
import { getClaimForClient } from "@/lib/claims/repository";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { deriveEvidenceSummary } from "./summary";
import { createClaimNotificationInTransaction } from "@/lib/notifications/repository";
import { createEvidenceRequirementReference } from "./keys";

type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<DbClient["transaction"]>[0] extends (tx: infer T, ...args: never[]) => unknown ? T : never;
export type EvidenceDbExecutor = DbClient | DbTransaction;

export async function getClaimEvidenceWorkspaceForClient(clerkUserId: string, claimReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned) return undefined;
  const db = getDb();
  const requirements = await db.select().from(claimEvidenceRequirements).where(and(eq(claimEvidenceRequirements.claimId, owned.claim.id), eq(claimEvidenceRequirements.clientVisible, true))).orderBy(asc(claimEvidenceRequirements.createdAt));
  const allDocuments = await db.select().from(claimDocuments).where(eq(claimDocuments.claimId, owned.claim.id)).orderBy(asc(claimDocuments.createdAt));
  const visibleRequirementIds = new Set(requirements.map((requirement) => requirement.id));
  const documents = allDocuments.filter((document) => !document.evidenceRequirementId || visibleRequirementIds.has(document.evidenceRequirementId));
  const requirementDocumentCounts = new Map<string, number>();
  for (const document of documents) if (document.evidenceRequirementId) requirementDocumentCounts.set(document.evidenceRequirementId, (requirementDocumentCounts.get(document.evidenceRequirementId) ?? 0) + 1);
  const visibleRequirements = requirements.map((requirement) => ({ ...requirement, documentCount: requirementDocumentCounts.get(requirement.id) ?? 0 }));
  const summary = deriveEvidenceSummary(visibleRequirements.map(({ status, required, documentCount }) => ({ status, required, documentCount })));
  return { ...owned, requirements: visibleRequirements, documents, summary };
}

export async function getEvidenceActionCountsForClient(clerkUserId: string) {
  const db = getDb();
  const profile = (await db.select({ id: clientProfiles.id }).from(clientProfiles).where(eq(clientProfiles.clerkUserId, clerkUserId)).limit(1))[0];
  if (!profile) return {};
  const rows = await db.select({ claimId: claimEvidenceRequirements.claimId, count: count() }).from(claimEvidenceRequirements).innerJoin(claims, eq(claims.id, claimEvidenceRequirements.claimId)).where(and(eq(claims.clientProfileId, profile.id), eq(claimEvidenceRequirements.clientVisible, true), eq(claimEvidenceRequirements.required, true), inArray(claimEvidenceRequirements.status, ["REQUESTED", "MORE_INFORMATION_REQUIRED"]))).groupBy(claimEvidenceRequirements.claimId);
  return Object.fromEntries(rows.map((row) => [row.claimId, Number(row.count)]));
}

export async function getDocumentIndexForClient(clerkUserId: string) {
  const db = getDb();
  const profile = (await db.select({ id: clientProfiles.id }).from(clientProfiles).where(eq(clientProfiles.clerkUserId, clerkUserId)).limit(1))[0];
  if (!profile) return [];
  return db.select({ claimReference: claims.claimReference, documentReference: claimDocuments.documentReference, displayName: claimDocuments.displayName, category: claimDocuments.category, mimeType: claimDocuments.mimeType, sizeBytes: claimDocuments.sizeBytes, status: claimDocuments.status, securityStatus: claimDocuments.securityStatus, uploadedAt: claimDocuments.uploadedAt, createdAt: claimDocuments.createdAt }).from(claimDocuments).innerJoin(claims, eq(claims.id, claimDocuments.claimId)).where(eq(claims.clientProfileId, profile.id)).orderBy(desc(claimDocuments.createdAt));
}

export async function requestEvidenceInTransaction(executor: EvidenceDbExecutor, claimId: string, evidenceType: string, options: { priority?: EvidenceRequirementPriority; required?: boolean; clientVisible?: boolean; dueAt?: Date | null } = {}) {
  if (!isEvidenceRequirementType(evidenceType)) throw new Error("Invalid evidence requirement type.");
  if (options.priority && !isEvidenceRequirementPriority(options.priority)) throw new Error("Invalid evidence requirement priority.");
  const definition = evidenceRequirementConfig[evidenceType];
  const claim = (await executor.select({ id: claims.id }).from(claims).where(eq(claims.id, claimId)).limit(1))[0];
  if (!claim) throw new Error("Claim not found.");
  const existing = (await executor.select().from(claimEvidenceRequirements).where(and(eq(claimEvidenceRequirements.claimId, claimId), eq(claimEvidenceRequirements.type, evidenceType))).orderBy(desc(claimEvidenceRequirements.createdAt)).limit(1))[0];
  if (existing && existing.status !== "WAIVED") return { requirement: existing, created: false };
  const now = new Date();
  const clientVisible = options.clientVisible ?? true;
  const requirement = (await executor.insert(claimEvidenceRequirements).values({ requirementReference: createEvidenceRequirementReference(), claimId, type: evidenceType, title: definition.label, description: definition.description, status: "REQUESTED", priority: options.priority ?? "NORMAL", clientVisible, required: options.required ?? true, dueAt: options.dueAt ?? null, createdAt: now, updatedAt: now }).returning())[0];
  if (clientVisible) {
    await executor.insert(claimTimelineEvents).values({ claimId, eventType: "EVIDENCE_REQUESTED", title: "Evidence requested", description: `${definition.label} has been requested for this claim.`, visibility: "CLIENT", occurredAt: now, createdAt: now });
    await createClaimNotificationInTransaction(executor, { claimId, type: "EVIDENCE_REQUESTED", context: { evidenceTitle: definition.label }, sourceType: "EVIDENCE_REQUIREMENT", sourceId: requirement.id, dedupeKey: `evidence-requested:${requirement.id}` });
  }
  return { requirement, created: true };
}

export async function requestEvidence(claimId: string, evidenceType: string, options: { priority?: EvidenceRequirementPriority; required?: boolean; clientVisible?: boolean; dueAt?: Date | null } = {}) {
  const db = getDb();
  return (await db.transaction((tx) => requestEvidenceInTransaction(tx, claimId, evidenceType, options))).requirement;
}

export async function updateEvidenceRequirementStatusInTransaction(executor: EvidenceDbExecutor, claimId: string, requirementId: string, requestedStatus: string) {
  if (!isEvidenceRequirementStatus(requestedStatus)) throw new Error("Invalid evidence requirement status.");
  const current = (await executor.select().from(claimEvidenceRequirements).where(and(eq(claimEvidenceRequirements.id, requirementId), eq(claimEvidenceRequirements.claimId, claimId))).limit(1))[0];
  if (!current) throw new Error("Evidence requirement not found.");
  if (!canTransitionEvidenceRequirement(current.status, requestedStatus)) throw new Error("Invalid evidence requirement transition.");
  if (["UPLOADED", "UNDER_REVIEW", "ACCEPTED", "MORE_INFORMATION_REQUIRED"].includes(requestedStatus)) {
    const linked = await executor.select({ securityStatus: claimDocuments.securityStatus, status: claimDocuments.status }).from(claimDocuments).where(and(eq(claimDocuments.claimId, claimId), eq(claimDocuments.evidenceRequirementId, requirementId)));
    if (!linked.some((document) => document.securityStatus === "VALIDATED" && document.status !== "REJECTED")) throw new Error("A validated supporting document is required for this evidence state.");
  }
  const now = new Date();
  const updated = (await executor.update(claimEvidenceRequirements).set({ status: requestedStatus, updatedAt: now, completedAt: requestedStatus === "ACCEPTED" || requestedStatus === "WAIVED" ? now : null }).where(and(eq(claimEvidenceRequirements.id, requirementId), eq(claimEvidenceRequirements.status, current.status))).returning())[0];
  if (!updated) throw new Error("Evidence requirement changed before it could be updated.");
  const timeline = evidenceStatusTimeline[requestedStatus];
  if (timeline && current.clientVisible) await executor.insert(claimTimelineEvents).values({ claimId, eventType: timeline.eventType, title: timeline.title, description: timeline.description, visibility: "CLIENT", occurredAt: now, createdAt: now });
  if (requestedStatus === "MORE_INFORMATION_REQUIRED" && current.clientVisible) await createClaimNotificationInTransaction(executor, { claimId, type: "EVIDENCE_MORE_INFORMATION_REQUIRED", context: { evidenceTitle: current.title }, sourceType: "EVIDENCE_STATUS", sourceId: updated.id, dedupeKey: `evidence-more-information:${updated.id}` });
  return { previous: current, updated };
}

export async function updateEvidenceRequirementStatus(claimId: string, requirementId: string, requestedStatus: string) {
  const db = getDb();
  return (await db.transaction((tx) => updateEvidenceRequirementStatusInTransaction(tx, claimId, requirementId, requestedStatus))).updated;
}

const evidenceStatusTimeline: Partial<Record<EvidenceRequirementStatus, { eventType: "DOCUMENT_RECEIVED" | "DOCUMENT_REVIEW_STARTED" | "DOCUMENT_ACCEPTED" | "MORE_EVIDENCE_REQUIRED"; title: string; description: string }>> = {
  UPLOADED: { eventType: "DOCUMENT_RECEIVED", title: "Evidence received", description: "Supporting evidence has been recorded against this requirement." },
  UNDER_REVIEW: { eventType: "DOCUMENT_REVIEW_STARTED", title: "Evidence review started", description: "The supporting evidence is now being reviewed." },
  ACCEPTED: { eventType: "DOCUMENT_ACCEPTED", title: "Evidence recorded as accepted", description: "The supporting evidence has been recorded as accepted for this workflow stage." },
  MORE_INFORMATION_REQUIRED: { eventType: "MORE_EVIDENCE_REQUIRED", title: "More evidence may be required", description: "Further supporting information may be needed before review can continue." },
};

export async function linkDocumentToRequirement(claimId: string, documentId: string, requirementId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const requirement = (await tx.select({ id: claimEvidenceRequirements.id }).from(claimEvidenceRequirements).where(and(eq(claimEvidenceRequirements.id, requirementId), eq(claimEvidenceRequirements.claimId, claimId))).limit(1))[0];
    const document = (await tx.select({ id: claimDocuments.id }).from(claimDocuments).where(and(eq(claimDocuments.id, documentId), eq(claimDocuments.claimId, claimId))).limit(1))[0];
    if (!requirement || !document) throw new Error("Document relationship is not valid.");
    return (await tx.update(claimDocuments).set({ evidenceRequirementId: requirementId, updatedAt: new Date() }).where(eq(claimDocuments.id, documentId)).returning())[0];
  });
}

export function getEvidenceDocumentCategory(type: EvidenceRequirementType): DocumentCategory {
  return evidenceRequirementConfig[type].documentCategory;
}
