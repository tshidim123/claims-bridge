import "server-only";

import { and, count, eq, sql } from "drizzle-orm";

import { isStaffRole, type StaffRole } from "@/config/staff";
import { getDb } from "@/lib/db";
import { staffUsers, type StaffUser } from "@/lib/db/schema/staff";
import { recordStaffAuditEvent, type StaffDbExecutor } from "@/lib/staff/audit";
import { createStaffReference } from "@/lib/staff/reference";
import { requirePermission } from "@/lib/staff/authorization";

export class StaffServiceError extends Error {
  constructor(public readonly code: "DUPLICATE" | "NOT_FOUND" | "INVALID_ROLE" | "LAST_SUPER_ADMIN" | "INVALID_STATE" | "FORBIDDEN" | "CONFIRMATION_REQUIRED", message: string) {
    super(message);
    this.name = "StaffServiceError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

type StaffMutationInput = { actorClerkUserId: string };

async function actorInTransaction(executor: StaffDbExecutor, clerkUserId: string) {
  return (await executor.select({ id: staffUsers.id, role: staffUsers.role, status: staffUsers.status }).from(staffUsers).where(eq(staffUsers.clerkUserId, clerkUserId)).limit(1))[0];
}

export async function createStaffUser(input: StaffMutationInput & { clerkUserId: string; displayName?: string | null; role: string }) {
  const actorContext = await requirePermission(input.actorClerkUserId, "STAFF_MANAGE");
  if (!isStaffRole(input.role)) throw new StaffServiceError("INVALID_ROLE", "The requested staff role is not available.");
  const role = input.role;
  if (role === "SUPER_ADMIN" && actorContext.role !== "SUPER_ADMIN") throw new StaffServiceError("FORBIDDEN", "Only an active super admin can create another super admin.");
  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      const actor = await actorInTransaction(tx, input.actorClerkUserId);
      if (!actor || actor.status !== "ACTIVE") throw new StaffServiceError("FORBIDDEN", "The staff actor is no longer active.");
      if (role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new StaffServiceError("FORBIDDEN", "Only an active super admin can create another super admin.");
      const actorId = actor.id;
      const inserted = (await tx.insert(staffUsers).values({ staffReference: createStaffReference(), clerkUserId: input.clerkUserId, displayName: input.displayName?.trim() || null, role, status: "ACTIVE", createdByStaffId: actorId ?? null }).returning())[0];
      await recordStaffAuditEvent(tx, { actorStaffUserId: actorId ?? null, actorType: "STAFF", action: "STAFF_CREATED", targetType: "STAFF_USER", targetReference: inserted.staffReference, metadata: { newRole: role } });
      return inserted;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new StaffServiceError("DUPLICATE", "That staff identity is already registered.");
    throw error;
  }
}

async function getTarget(targetReference: string, executor: StaffDbExecutor) {
  return (await executor.select().from(staffUsers).where(eq(staffUsers.staffReference, targetReference)).limit(1))[0];
}

async function activeSuperAdminCount(executor: StaffDbExecutor): Promise<number> {
  const [result] = await executor.select({ count: count() }).from(staffUsers).where(and(eq(staffUsers.role, "SUPER_ADMIN"), eq(staffUsers.status, "ACTIVE")));
  return Number(result?.count ?? 0);
}

async function assertCanRemoveLastSuperAdmin(executor: StaffDbExecutor, target: StaffUser, newRole?: StaffRole, suspending = false) {
  if (target.status !== "ACTIVE" || target.role !== "SUPER_ADMIN") return;
  if ((newRole && newRole === "SUPER_ADMIN") || (!newRole && !suspending)) return;
  await executor.execute(sql`select pg_advisory_xact_lock(hashtext('claims_bridge_staff_admin'))`);
  if (await activeSuperAdminCount(executor) <= 1) throw new StaffServiceError("LAST_SUPER_ADMIN", "The last active super admin must remain available.");
}

export async function changeStaffRole(input: StaffMutationInput & { targetReference: string; role: string; confirmed?: boolean }) {
  await requirePermission(input.actorClerkUserId, "STAFF_MANAGE");
  if (!isStaffRole(input.role)) throw new StaffServiceError("INVALID_ROLE", "The requested staff role is not available.");
  const role = input.role;
  const db = getDb();
  return db.transaction(async (tx) => {
    const target = await getTarget(input.targetReference, tx);
    if (!target) throw new StaffServiceError("NOT_FOUND", "Staff record not found.");
    if (target.role === role) return target;
    const actor = await actorInTransaction(tx, input.actorClerkUserId);
    if (!actor || actor.status !== "ACTIVE") throw new StaffServiceError("FORBIDDEN", "The staff actor is no longer active.");
    if (actor.id === target.id) throw new StaffServiceError("INVALID_STATE", "Staff cannot change their own access from this workspace.");
    if ((target.role === "SUPER_ADMIN" || role === "SUPER_ADMIN") && actor.role !== "SUPER_ADMIN") throw new StaffServiceError("FORBIDDEN", "Only an active super admin can change super admin access.");
    if (!input.confirmed) throw new StaffServiceError("CONFIRMATION_REQUIRED", "Confirm the proposed role change before continuing.");
    await assertCanRemoveLastSuperAdmin(tx, target, role);
    const updated = (await tx.update(staffUsers).set({ role, updatedAt: new Date() }).where(eq(staffUsers.id, target.id)).returning())[0];
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor.id, actorType: "STAFF", action: "STAFF_ROLE_CHANGED", targetType: "STAFF_USER", targetReference: target.staffReference, metadata: { previousRole: target.role, newRole: role } });
    return updated;
  });
}

export async function suspendStaffUser(input: StaffMutationInput & { targetReference: string; reasonCode?: string; confirmed?: boolean }) {
  await requirePermission(input.actorClerkUserId, "STAFF_MANAGE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const target = await getTarget(input.targetReference, tx);
    if (!target) throw new StaffServiceError("NOT_FOUND", "Staff record not found.");
    if (target.status === "SUSPENDED") return target;
    const actor = await actorInTransaction(tx, input.actorClerkUserId);
    if (!actor || actor.status !== "ACTIVE") throw new StaffServiceError("FORBIDDEN", "The staff actor is no longer active.");
    if (actor.id === target.id) throw new StaffServiceError("INVALID_STATE", "Staff cannot suspend their own access from this workspace.");
    if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new StaffServiceError("FORBIDDEN", "Only an active super admin can suspend a super admin.");
    if (!input.confirmed) throw new StaffServiceError("CONFIRMATION_REQUIRED", "Confirm the suspension before continuing.");
    await assertCanRemoveLastSuperAdmin(tx, target, undefined, true);
    const actorId = actor.id;
    const updated = (await tx.update(staffUsers).set({ status: "SUSPENDED", suspendedAt: new Date(), suspendedByStaffId: actorId ?? null, updatedAt: new Date() }).where(eq(staffUsers.id, target.id)).returning())[0];
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor.id, actorType: "STAFF", action: "STAFF_SUSPENDED", targetType: "STAFF_USER", targetReference: target.staffReference, metadata: { previousStatus: "ACTIVE", newStatus: "SUSPENDED", reasonCode: input.reasonCode } });
    return updated;
  });
}

export async function reactivateStaffUser(input: StaffMutationInput & { targetReference: string }) {
  await requirePermission(input.actorClerkUserId, "STAFF_MANAGE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const target = await getTarget(input.targetReference, tx);
    if (!target) throw new StaffServiceError("NOT_FOUND", "Staff record not found.");
    if (target.status === "ACTIVE") return target;
    const actor = await actorInTransaction(tx, input.actorClerkUserId);
    if (!actor || actor.status !== "ACTIVE") throw new StaffServiceError("FORBIDDEN", "The staff actor is no longer active.");
    if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new StaffServiceError("FORBIDDEN", "Only an active super admin can reactivate a super admin.");
    const updated = (await tx.update(staffUsers).set({ status: "ACTIVE", suspendedAt: null, updatedAt: new Date() }).where(eq(staffUsers.id, target.id)).returning())[0];
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor.id, actorType: "STAFF", action: "STAFF_REACTIVATED", targetType: "STAFF_USER", targetReference: target.staffReference, metadata: { previousStatus: "SUSPENDED", newStatus: "ACTIVE" } });
    return updated;
  });
}
