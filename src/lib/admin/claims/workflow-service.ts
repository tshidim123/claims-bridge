import "server-only";

import { and, eq } from "drizzle-orm";

import { canTransitionClaimStatus, claimStatusConfig, isClaimStatus, isTerminalClaimStatus, type ClaimStatus } from "@/config/claim-statuses";
import { documentStatuses, evidenceRequirementConfig, isEvidenceRequirementPriority, isEvidenceRequirementStatus, isEvidenceRequirementType, type EvidenceRequirementPriority, type EvidenceRequirementType } from "@/config/evidence";
import type { DocumentStatus } from "@/config/evidence";
import { hasPermissionForRole } from "@/config/staff";
import { getDb } from "@/lib/db";
import { claims } from "@/lib/db/schema/claims";
import { claimEvidenceRequirements } from "@/lib/db/schema/evidence";
import { transitionClaimStatusInTransaction } from "@/lib/claims/transitions";
import { requestEvidenceInTransaction, updateEvidenceRequirementStatusInTransaction } from "@/lib/evidence/repository";
import { transitionDocumentStatusInTransaction, isDocumentReviewAvailable } from "@/lib/documents/service";
import { recordStaffAuditEvent, type StaffDbExecutor } from "@/lib/staff/audit";
import { requirePermission } from "@/lib/staff/authorization";
import { staffUsers } from "@/lib/db/schema/staff";

export class StaffWorkflowError extends Error {
  constructor(public readonly code: "CLAIM_NOT_FOUND" | "REQUIREMENT_NOT_FOUND" | "DOCUMENT_NOT_FOUND" | "INVALID_STATUS" | "INVALID_TRANSITION" | "TERMINAL_CLAIM" | "CONFIRMATION_REQUIRED" | "INVALID_EVIDENCE_TYPE" | "INVALID_EVIDENCE_PRIORITY" | "INVALID_DUE_DATE" | "DUPLICATE_REQUEST" | "DOCUMENT_NOT_REVIEWABLE" | "TECHNICAL_STATE_REQUIRED" | "CONCURRENT_CHANGE" | "FORBIDDEN") {
    super(code);
    this.name = "StaffWorkflowError";
  }
}

type StaffWorkflowActor = { staffUserId: string; staffReference: string; clerkUserId: string };

function isDocumentStatus(value: string): value is DocumentStatus {
  return documentStatuses.includes(value as DocumentStatus);
}

async function getActorInTransaction(executor: StaffDbExecutor, clerkUserId: string, permission: "CLAIMS_TRANSITION_STATUS" | "EVIDENCE_REQUEST" | "EVIDENCE_REVIEW" | "DOCUMENTS_REVIEW") : Promise<StaffWorkflowActor> {
  const actor = (await executor.select({ id: staffUsers.id, staffReference: staffUsers.staffReference, role: staffUsers.role, status: staffUsers.status }).from(staffUsers).where(eq(staffUsers.clerkUserId, clerkUserId)).limit(1))[0];
  if (!actor || actor.status !== "ACTIVE") throw new StaffWorkflowError("FORBIDDEN");
  if (!hasPermissionForRole(actor.role, permission)) throw new StaffWorkflowError("FORBIDDEN");
  return { staffUserId: actor.id, staffReference: actor.staffReference, clerkUserId };
}

async function claimIdForReference(executor: StaffDbExecutor, claimReference: string) {
  return (await executor.select({ id: claims.id, status: claims.status }).from(claims).where(eq(claims.claimReference, claimReference)).limit(1))[0];
}

export function getAllowedClaimTransitions(status: ClaimStatus) {
  if (isTerminalClaimStatus(status)) return [] as ClaimStatus[];
  return (Object.keys(claimStatusConfig) as ClaimStatus[]).filter((candidate) => canTransitionClaimStatus(status, candidate));
}

export async function transitionClaimStatusForStaff(clerkUserId: string, claimReference: string, requestedStatus: string, confirmed = false) {
  await requirePermission(clerkUserId, "CLAIMS_TRANSITION_STATUS");
  if (!isClaimStatus(requestedStatus)) throw new StaffWorkflowError("INVALID_STATUS");
  if (isTerminalClaimStatus(requestedStatus) && !confirmed) throw new StaffWorkflowError("CONFIRMATION_REQUIRED");
  const db = getDb();
  return db.transaction(async (tx) => {
    const actor = await getActorInTransaction(tx, clerkUserId, "CLAIMS_TRANSITION_STATUS");
    const claim = await claimIdForReference(tx, claimReference);
    if (!claim) throw new StaffWorkflowError("CLAIM_NOT_FOUND");
    if (isTerminalClaimStatus(claim.status)) throw new StaffWorkflowError("TERMINAL_CLAIM");
    let transition;
    try {
      transition = await transitionClaimStatusInTransaction(tx, claim.id, requestedStatus, { actorType: "STAFF" });
    } catch (error) {
      const code = error instanceof Error ? (error as { code?: string }).code : undefined;
      if (code === "INVALID_STATUS" || code === "INVALID_TRANSITION") throw new StaffWorkflowError(code);
      if (code === "TERMINAL_STATUS") throw new StaffWorkflowError("TERMINAL_CLAIM");
      if (code === "CONCURRENT_TRANSITION") throw new StaffWorkflowError("CONCURRENT_CHANGE");
      throw error;
    }
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor.staffUserId, actorType: "STAFF", action: "CLAIM_STATUS_CHANGED", targetType: "CLAIM", targetReference: claimReference, metadata: { fromStatus: transition.previousStatus, toStatus: requestedStatus } });
    return { previousStatus: transition.previousStatus, status: transition.updated.status };
  });
}

function parseDueDate(value: string | undefined) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new StaffWorkflowError("INVALID_DUE_DATE");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new StaffWorkflowError("INVALID_DUE_DATE");
  return date;
}

export async function requestEvidenceForStaff(clerkUserId: string, claimReference: string, evidenceType: string, options: { required?: boolean; priority?: string; dueDate?: string } = {}) {
  await requirePermission(clerkUserId, "EVIDENCE_REQUEST");
  if (!isEvidenceRequirementType(evidenceType)) throw new StaffWorkflowError("INVALID_EVIDENCE_TYPE");
  if (options.priority && !isEvidenceRequirementPriority(options.priority)) throw new StaffWorkflowError("INVALID_EVIDENCE_PRIORITY");
  const dueAt = parseDueDate(options.dueDate);
  const db = getDb();
  return db.transaction(async (tx) => {
    const actor = await getActorInTransaction(tx, clerkUserId, "EVIDENCE_REQUEST");
    const claim = await claimIdForReference(tx, claimReference);
    if (!claim) throw new StaffWorkflowError("CLAIM_NOT_FOUND");
    if (isTerminalClaimStatus(claim.status)) throw new StaffWorkflowError("TERMINAL_CLAIM");
    const result = await requestEvidenceInTransaction(tx, claim.id, evidenceType, { required: options.required ?? true, priority: (options.priority as EvidenceRequirementPriority | undefined) ?? "NORMAL", clientVisible: true, dueAt });
    if (!result.requirement.clientVisible) throw new StaffWorkflowError("FORBIDDEN");
    if (!result.created) return { requirementReference: result.requirement.requirementReference, created: false };
    const definition = evidenceRequirementConfig[evidenceType as EvidenceRequirementType];
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor.staffUserId, actorType: "STAFF", action: "EVIDENCE_REQUESTED", targetType: "CLAIM", targetReference: claimReference, metadata: { evidenceType, required: result.requirement.required, priority: result.requirement.priority, dueDate: result.requirement.dueAt?.toISOString().slice(0, 10) ?? "NONE", requirementReference: result.requirement.requirementReference } });
    return { requirementReference: result.requirement.requirementReference, created: true, title: definition.label };
  });
}

export async function reviewEvidenceForStaff(clerkUserId: string, claimReference: string, requirementReference: string, requestedStatus: string) {
  await requirePermission(clerkUserId, "EVIDENCE_REVIEW");
  if (!isEvidenceRequirementStatus(requestedStatus) || requestedStatus === "UPLOADED") throw new StaffWorkflowError("INVALID_STATUS");
  const db = getDb();
  return db.transaction(async (tx) => {
    const actor = await getActorInTransaction(tx, clerkUserId, "EVIDENCE_REVIEW");
    const claim = await claimIdForReference(tx, claimReference);
    if (!claim) throw new StaffWorkflowError("CLAIM_NOT_FOUND");
    if (isTerminalClaimStatus(claim.status)) throw new StaffWorkflowError("TERMINAL_CLAIM");
    const requirement = (await tx.select({ id: claimEvidenceRequirements.id, status: claimEvidenceRequirements.status, clientVisible: claimEvidenceRequirements.clientVisible }).from(claimEvidenceRequirements).where(and(eq(claimEvidenceRequirements.claimId, claim.id), eq(claimEvidenceRequirements.requirementReference, requirementReference))).limit(1))[0];
    if (!requirement) throw new StaffWorkflowError("REQUIREMENT_NOT_FOUND");
    if (!requirement.clientVisible) throw new StaffWorkflowError("FORBIDDEN");
    if (requestedStatus !== "WAIVED" && !isDocumentReviewAvailable()) throw new StaffWorkflowError("DOCUMENT_NOT_REVIEWABLE");
    let result;
    try {
      result = await updateEvidenceRequirementStatusInTransaction(tx, claim.id, requirement.id, requestedStatus);
    } catch (error) {
      if (error instanceof Error && error.message.includes("changed before")) throw new StaffWorkflowError("CONCURRENT_CHANGE");
      if (error instanceof Error && error.message.includes("Invalid evidence")) throw new StaffWorkflowError("INVALID_TRANSITION");
      if (error instanceof Error && error.message.includes("validated supporting")) throw new StaffWorkflowError("TECHNICAL_STATE_REQUIRED");
      throw error;
    }
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor.staffUserId, actorType: "STAFF", action: "EVIDENCE_STATUS_CHANGED", targetType: "CLAIM", targetReference: claimReference, metadata: { fromEvidenceStatus: result.previous.status, toEvidenceStatus: result.updated.status, requirementReference } });
    return { previousStatus: result.previous.status, status: result.updated.status };
  });
}

export async function reviewDocumentForStaff(clerkUserId: string, claimReference: string, documentReference: string, requestedStatus: string, confirmed = false) {
  await requirePermission(clerkUserId, "DOCUMENTS_REVIEW");
  if (!isDocumentStatus(requestedStatus) || requestedStatus === "UPLOADED" || requestedStatus === "PENDING_UPLOAD") throw new StaffWorkflowError("INVALID_STATUS");
  if (["REJECTED", "REPLACEMENT_REQUESTED"].includes(requestedStatus) && !confirmed) throw new StaffWorkflowError("CONFIRMATION_REQUIRED");
  const db = getDb();
  return db.transaction(async (tx) => {
    const actor = await getActorInTransaction(tx, clerkUserId, "DOCUMENTS_REVIEW");
    const claim = await claimIdForReference(tx, claimReference);
    if (!claim) throw new StaffWorkflowError("CLAIM_NOT_FOUND");
    if (isTerminalClaimStatus(claim.status)) throw new StaffWorkflowError("TERMINAL_CLAIM");
    let result;
    try {
      result = await transitionDocumentStatusInTransaction(tx, claim.id, documentReference, requestedStatus);
    } catch (error) {
      if (error instanceof Error && error.message.includes("no longer available")) throw new StaffWorkflowError("INVALID_TRANSITION");
      if (error instanceof Error && error.message.includes("Binary document")) throw new StaffWorkflowError("DOCUMENT_NOT_REVIEWABLE");
      if (error instanceof Error && error.message.includes("linked evidence")) throw new StaffWorkflowError("INVALID_TRANSITION");
      throw error;
    }
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor.staffUserId, actorType: "STAFF", action: "DOCUMENT_STATUS_CHANGED", targetType: "CLAIM", targetReference: claimReference, metadata: { fromDocumentStatus: result.previous.status, toDocumentStatus: result.updated.status, documentReference } });
    if (result.evidenceChange) await recordStaffAuditEvent(tx, { actorStaffUserId: actor.staffUserId, actorType: "STAFF", action: "EVIDENCE_STATUS_CHANGED", targetType: "CLAIM", targetReference: claimReference, metadata: { fromEvidenceStatus: result.evidenceChange.previous.status, toEvidenceStatus: result.evidenceChange.updated.status, requirementReference: result.evidenceChange.updated.requirementReference } });
    return { previousStatus: result.previous.status, status: result.updated.status };
  });
}
