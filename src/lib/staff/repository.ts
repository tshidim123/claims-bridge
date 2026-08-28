import "server-only";

import { and, asc, desc, eq, gte, ilike, lt } from "drizzle-orm";

import { staffAuditActions, type StaffAuditAction } from "@/config/staff";
import { getDb } from "@/lib/db";
import { staffAuditEvents, staffUsers } from "@/lib/db/schema/staff";
import { requirePermission } from "@/lib/staff/authorization";

export async function getStaffDirectory() {
  return getDb().select({ staffReference: staffUsers.staffReference, displayName: staffUsers.displayName, role: staffUsers.role, status: staffUsers.status, createdAt: staffUsers.createdAt }).from(staffUsers).orderBy(asc(staffUsers.createdAt), asc(staffUsers.staffReference));
}

export async function getStaffAuditEventsForViewer(before?: string, limit = 100, targetReference?: string) {
  const db = getDb();
  const beforeDate = before ? new Date(before) : undefined;
  const conditions = [targetReference ? eq(staffAuditEvents.targetReference, targetReference) : undefined, beforeDate && !Number.isNaN(beforeDate.getTime()) ? lt(staffAuditEvents.createdAt, beforeDate) : undefined].filter(Boolean);
  const rows = await db.select({ action: staffAuditEvents.action, actorType: staffAuditEvents.actorType, actorReference: staffUsers.staffReference, actorName: staffUsers.displayName, targetType: staffAuditEvents.targetType, targetReference: staffAuditEvents.targetReference, metadata: staffAuditEvents.metadata, createdAt: staffAuditEvents.createdAt }).from(staffAuditEvents).leftJoin(staffUsers, eq(staffAuditEvents.actorStaffUserId, staffUsers.id)).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(staffAuditEvents.createdAt), desc(staffAuditEvents.id)).limit(Math.min(100, Math.max(1, limit)) + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return { events: page.map((row) => ({ action: row.action, actor: row.actorName ?? (row.actorType === "SYSTEM" ? "System" : "Claims Bridge staff"), actorReference: row.actorReference, targetType: row.targetType, targetReference: row.targetReference, metadata: row.metadata, createdAt: row.createdAt.toISOString() })), nextCursor: hasMore && page.at(-1) ? page.at(-1)!.createdAt.toISOString() : null };
}

export type StaffAuditExplorerInput = { action?: string; actor?: string; targetType?: string; targetReference?: string; from?: string; to?: string; before?: string };

export async function getStaffAuditExplorer(clerkUserId: string, input: StaffAuditExplorerInput = {}) {
  await requirePermission(clerkUserId, "AUDIT_VIEW");
  const db = getDb();
  const conditions = [];
  if (input.action && (staffAuditActions as readonly string[]).includes(input.action)) conditions.push(eq(staffAuditEvents.action, input.action as StaffAuditAction));
  if (input.targetType && ["STAFF_USER", "CLAIM", "CLIENT", "EVIDENCE_REQUIREMENT", "DOCUMENT", "CONVERSATION", "ACTION"].includes(input.targetType)) conditions.push(eq(staffAuditEvents.targetType, input.targetType));
  if (input.actor?.trim()) conditions.push(ilike(staffUsers.staffReference, `%${input.actor.trim().slice(0, 40).replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));
  if (input.targetReference?.trim()) conditions.push(ilike(staffAuditEvents.targetReference, `%${input.targetReference.trim().slice(0, 100).replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));
  const from = input.from ? new Date(input.from) : undefined; const to = input.to ? new Date(input.to) : undefined; const before = input.before ? new Date(input.before) : undefined;
  if (from && !Number.isNaN(from.getTime())) conditions.push(gte(staffAuditEvents.createdAt, from));
  if (to && !Number.isNaN(to.getTime())) { const end = new Date(to); end.setDate(end.getDate() + 1); conditions.push(lt(staffAuditEvents.createdAt, end)); }
  if (before && !Number.isNaN(before.getTime())) conditions.push(lt(staffAuditEvents.createdAt, before));
  const limit = 100;
  const rows = await db.select({ action: staffAuditEvents.action, actorType: staffAuditEvents.actorType, actorReference: staffUsers.staffReference, actorName: staffUsers.displayName, targetType: staffAuditEvents.targetType, targetReference: staffAuditEvents.targetReference, metadata: staffAuditEvents.metadata, createdAt: staffAuditEvents.createdAt }).from(staffAuditEvents).leftJoin(staffUsers, eq(staffAuditEvents.actorStaffUserId, staffUsers.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(staffAuditEvents.createdAt), desc(staffAuditEvents.id)).limit(limit + 1);
  const page = rows.slice(0, limit);
  return { events: page.map((row) => ({ action: row.action, actor: row.actorName ?? (row.actorType === "SYSTEM" ? "System" : "Claims Bridge staff"), actorReference: row.actorReference, targetType: row.targetType, targetReference: row.targetReference, metadata: row.metadata, createdAt: row.createdAt.toISOString() })), nextCursor: rows.length > limit && page.at(-1) ? page.at(-1)!.createdAt.toISOString() : null };
}
