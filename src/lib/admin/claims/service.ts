import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { isOperationalPriority, type OperationalPriority, internalNoteMaxLength } from "@/config/admin-claims";
import { isStaffRole, hasPermissionForRole } from "@/config/staff";
import { getDb } from "@/lib/db";
import { claims } from "@/lib/db/schema/claims";
import { claimAssignments, claimInternalNotes } from "@/lib/db/schema/operations";
import { staffUsers } from "@/lib/db/schema/staff";
import { recordStaffAuditEvent, type StaffDbExecutor } from "@/lib/staff/audit";
import { requirePermission } from "@/lib/staff/authorization";
import { createInternalNoteReference } from "./references";

export class AdminClaimServiceError extends Error {
  constructor(public readonly code: "CLAIM_NOT_FOUND" | "STAFF_NOT_FOUND" | "STAFF_NOT_ASSIGNABLE" | "INVALID_PRIORITY" | "INVALID_NOTE" | "LAST_ASSIGNMENT_STATE" | "DUPLICATE") {
    super(code);
    this.name = "AdminClaimServiceError";
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

async function getActorIdInTransaction(executor: StaffDbExecutor, clerkUserId: string) {
  return (await executor.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.clerkUserId, clerkUserId)).limit(1))[0]?.id;
}

export async function setClaimPriority(clerkUserId: string, claimReference: string, requestedPriority: string) {
  await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  if (!isOperationalPriority(requestedPriority)) throw new AdminClaimServiceError("INVALID_PRIORITY");
  const priority = requestedPriority as OperationalPriority;
  const db = getDb();

  return db.transaction(async (tx) => {
    const claim = (await tx.select({ id: claims.id, operationalPriority: claims.operationalPriority }).from(claims).where(eq(claims.claimReference, claimReference)).limit(1))[0];
    if (!claim) throw new AdminClaimServiceError("CLAIM_NOT_FOUND");
    if (claim.operationalPriority === priority) return claim;
    const actorId = await getActorIdInTransaction(tx, clerkUserId);
    if (!actorId) throw new AdminClaimServiceError("STAFF_NOT_FOUND");
    const updated = (await tx.update(claims).set({ operationalPriority: priority, updatedAt: new Date() }).where(eq(claims.id, claim.id)).returning())[0];
    await recordStaffAuditEvent(tx, { actorStaffUserId: actorId, actorType: "STAFF", action: "CLAIM_PRIORITY_CHANGED", targetType: "CLAIM", targetReference: claimReference, metadata: { previousPriority: claim.operationalPriority, newPriority: priority } });
    return updated;
  });
}

async function getAssignableStaffByReference(executor: StaffDbExecutor, staffReference: string) {
  return (await executor.select({ id: staffUsers.id, staffReference: staffUsers.staffReference, role: staffUsers.role, status: staffUsers.status, displayName: staffUsers.displayName }).from(staffUsers).where(and(eq(staffUsers.staffReference, staffReference), eq(staffUsers.status, "ACTIVE"))).limit(1))[0];
}

function ensureAssignable(staff: { role: string; status: string } | undefined) {
  if (!staff) throw new AdminClaimServiceError("STAFF_NOT_ASSIGNABLE");
  if (staff.status !== "ACTIVE" || !isStaffRole(staff.role) || !hasPermissionForRole(staff.role, "CLAIMS_MANAGE")) throw new AdminClaimServiceError("STAFF_NOT_ASSIGNABLE");
}

export async function assignClaim(clerkUserId: string, claimReference: string, staffReference: string) {
  await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      const claim = (await tx.select({ id: claims.id }).from(claims).where(eq(claims.claimReference, claimReference)).limit(1))[0];
      if (!claim) throw new AdminClaimServiceError("CLAIM_NOT_FOUND");
      const target = await getAssignableStaffByReference(tx, staffReference);
      ensureAssignable(target);
      const actorId = await getActorIdInTransaction(tx, clerkUserId);
      if (!actorId || !target) throw new AdminClaimServiceError("STAFF_NOT_FOUND");
      const current = (await tx.select({ id: claimAssignments.id, staffUserId: claimAssignments.staffUserId, staffReference: staffUsers.staffReference }).from(claimAssignments).innerJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(and(eq(claimAssignments.claimId, claim.id), isNull(claimAssignments.unassignedAt))).limit(1))[0];
      if (current?.staffUserId === target.id) return target;
      const now = new Date();
      if (current) {
        await tx.update(claimAssignments).set({ unassignedAt: now, unassignedByStaffUserId: actorId }).where(eq(claimAssignments.id, current.id));
      }
      await tx.insert(claimAssignments).values({ claimId: claim.id, staffUserId: target.id, assignedAt: now, assignedByStaffUserId: actorId });
      await recordStaffAuditEvent(tx, { actorStaffUserId: actorId, actorType: "STAFF", action: current ? "CLAIM_REASSIGNED" : "CLAIM_ASSIGNED", targetType: "CLAIM", targetReference: claimReference, metadata: { previousStaffReference: current?.staffReference ?? "UNASSIGNED", newStaffReference: target.staffReference } });
      return target;
    });
  } catch (error) {
    if (error instanceof AdminClaimServiceError) throw error;
    if (isUniqueViolation(error)) throw new AdminClaimServiceError("DUPLICATE");
    throw error;
  }
}

export async function assignClaimToSelf(clerkUserId: string, claimReference: string) {
  await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  const db = getDb();
  const actor = (await db.select({ staffReference: staffUsers.staffReference }).from(staffUsers).where(eq(staffUsers.clerkUserId, clerkUserId)).limit(1))[0];
  if (!actor) throw new AdminClaimServiceError("STAFF_NOT_FOUND");
  return assignClaim(clerkUserId, claimReference, actor.staffReference);
}

export async function unassignClaim(clerkUserId: string, claimReference: string) {
  await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const claim = (await tx.select({ id: claims.id }).from(claims).where(eq(claims.claimReference, claimReference)).limit(1))[0];
    if (!claim) throw new AdminClaimServiceError("CLAIM_NOT_FOUND");
    const current = (await tx.select({ id: claimAssignments.id, staffUserId: claimAssignments.staffUserId, staffReference: staffUsers.staffReference }).from(claimAssignments).innerJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(and(eq(claimAssignments.claimId, claim.id), isNull(claimAssignments.unassignedAt))).limit(1))[0];
    if (!current) return null;
    const actorId = await getActorIdInTransaction(tx, clerkUserId);
    if (!actorId) throw new AdminClaimServiceError("STAFF_NOT_FOUND");
    await tx.update(claimAssignments).set({ unassignedAt: new Date(), unassignedByStaffUserId: actorId }).where(eq(claimAssignments.id, current.id));
    await recordStaffAuditEvent(tx, { actorStaffUserId: actorId, actorType: "STAFF", action: "CLAIM_UNASSIGNED", targetType: "CLAIM", targetReference: claimReference, metadata: { previousStaffReference: current.staffReference, newStaffReference: "UNASSIGNED" } });
    return current;
  });
}

export async function addInternalClaimNote(clerkUserId: string, claimReference: string, body: unknown) {
  await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  if (typeof body !== "string") throw new AdminClaimServiceError("INVALID_NOTE");
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > internalNoteMaxLength) throw new AdminClaimServiceError("INVALID_NOTE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const claim = (await tx.select({ id: claims.id }).from(claims).where(eq(claims.claimReference, claimReference)).limit(1))[0];
    if (!claim) throw new AdminClaimServiceError("CLAIM_NOT_FOUND");
    const actorId = await getActorIdInTransaction(tx, clerkUserId);
    if (!actorId) throw new AdminClaimServiceError("STAFF_NOT_FOUND");
    const note = (await tx.insert(claimInternalNotes).values({ noteReference: createInternalNoteReference(), claimId: claim.id, authorStaffUserId: actorId, body: trimmed }).returning())[0];
    await recordStaffAuditEvent(tx, { actorStaffUserId: actorId, actorType: "STAFF", action: "CLAIM_INTERNAL_NOTE_ADDED", targetType: "CLAIM", targetReference: claimReference });
    return note;
  });
}
