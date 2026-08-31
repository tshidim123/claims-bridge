import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";

import { staffAuditActions, staffAuditActorTypes, type StaffAuditAction, type StaffAuditActorType } from "@/config/staff";
import { getDb } from "@/lib/db";
import { staffAuditEvents, staffUsers } from "@/lib/db/schema/staff";

type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<DbClient["transaction"]>[0] extends (tx: infer T, ...args: never[]) => unknown ? T : never;
export type StaffDbExecutor = DbClient | DbTransaction;

const allowedMetadataKeys = new Set(["previousRole", "newRole", "previousPriority", "newPriority", "previousStaffReference", "newStaffReference", "reasonCode", "previousStatus", "newStatus", "fromStatus", "toStatus", "fromEvidenceStatus", "toEvidenceStatus", "fromDocumentStatus", "toDocumentStatus", "evidenceType", "required", "priority", "dueDate", "requirementReference", "documentReference", "messageType", "senderType", "actionType", "actionReference", "changedFields", "leadStatus", "fromLeadStatus", "toLeadStatus", "conversionState"]);

export function sanitizeAuditMetadata(value: unknown): Record<string, string | number | boolean | string[]> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const sanitized: Record<string, string | number | boolean | string[]> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!allowedMetadataKeys.has(key)) continue;
    if (Array.isArray(candidate) && key === "changedFields" && candidate.every((item): item is string => typeof item === "string")) sanitized[key] = candidate.slice(0, 20).map((item) => item.slice(0, 80));
    else if (typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean") sanitized[key] = typeof candidate === "string" ? candidate.slice(0, 120) : candidate;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export type RecordStaffAuditEventInput = {
  actorStaffUserId?: string | null;
  actorType: StaffAuditActorType;
  action: StaffAuditAction;
  targetType?: string | null;
  targetReference?: string | null;
  metadata?: unknown;
};

export async function recordStaffAuditEvent(executor: StaffDbExecutor, input: RecordStaffAuditEventInput) {
  if (!(staffAuditActions as readonly string[]).includes(input.action)) throw new Error("Invalid staff audit action.");
  if (!(staffAuditActorTypes as readonly string[]).includes(input.actorType)) throw new Error("Invalid staff audit actor type.");
  if (input.actorType === "STAFF" && !input.actorStaffUserId) throw new Error("Staff audit events require an actor.");
  return (await executor.insert(staffAuditEvents).values({ actorStaffUserId: input.actorStaffUserId ?? null, actorType: input.actorType, action: input.action, targetType: input.targetType ?? null, targetReference: input.targetReference ?? null, metadata: sanitizeAuditMetadata(input.metadata) }).returning())[0];
}

export type StaffAuditView = {
  actorName: string;
  actorReference: string | null;
  action: StaffAuditAction;
  targetType: string | null;
  targetReference: string | null;
  metadata: Record<string, string | number | boolean | string[]> | null;
  createdAt: string;
};

export async function getStaffAuditEvents(before?: string, limit = 100): Promise<{ events: readonly StaffAuditView[]; nextCursor: string | null }> {
  const db = getDb();
  const parsedBefore = before ? new Date(before) : undefined;
  const conditions = parsedBefore && !Number.isNaN(parsedBefore.getTime()) ? lt(staffAuditEvents.createdAt, parsedBefore) : undefined;
  const rows = await db.select({ action: staffAuditEvents.action, actorType: staffAuditEvents.actorType, actorReference: staffUsers.staffReference, actorName: staffUsers.displayName, targetType: staffAuditEvents.targetType, targetReference: staffAuditEvents.targetReference, metadata: staffAuditEvents.metadata, createdAt: staffAuditEvents.createdAt }).from(staffAuditEvents).leftJoin(staffUsers, eq(staffAuditEvents.actorStaffUserId, staffUsers.id)).where(conditions ? and(conditions) : undefined).orderBy(desc(staffAuditEvents.createdAt), desc(staffAuditEvents.id)).limit(Math.min(100, Math.max(1, limit)) + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return { events: page.map((row) => ({ actorName: row.actorName ?? (row.actorType === "SYSTEM" ? "System" : "Claims Bridge staff"), actorReference: row.actorReference, action: row.action, targetType: row.targetType, targetReference: row.targetReference, metadata: row.metadata, createdAt: row.createdAt.toISOString() })), nextCursor: hasMore && page.at(-1) ? page.at(-1)!.createdAt.toISOString() : null };
}
