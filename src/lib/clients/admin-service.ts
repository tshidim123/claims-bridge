import "server-only";

import { and, eq } from "drizzle-orm";

import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { getDb } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema/staff";
import { requirePermission } from "@/lib/staff/authorization";
import { recordStaffAuditEvent } from "@/lib/staff/audit";

const CLIENT_REFERENCE_PATTERN = /^CB-CLT-[0-9A-F]{8}$/;
const EDITABLE_FIELDS = ["firstName", "lastName", "phone", "preferredContactMethod"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export class ClientProfileServiceError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "INVALID_REFERENCE" | "INVALID_FIELD" | "INVALID_VALUE" | "STALE", message: string) { super(message); this.name = "ClientProfileServiceError"; }
}

function stringValue(value: unknown, max: number) {
  if (typeof value !== "string") throw new ClientProfileServiceError("INVALID_VALUE", "Client details must be plain text.");
  const result = value.trim(); if (!result || result.length > max) throw new ClientProfileServiceError("INVALID_VALUE", "Check the client detail and try again."); return result;
}

export async function updateClientOperationalProfile(input: { actorClerkUserId: string; clientReference: string; expectedUpdatedAt: string; firstName: string; lastName: string; phone: string | null; preferredContactMethod: string }) {
  await requirePermission(input.actorClerkUserId, "CLIENTS_MANAGE");
  if (!CLIENT_REFERENCE_PATTERN.test(input.clientReference)) throw new ClientProfileServiceError("INVALID_REFERENCE", "That client reference is not valid.");
  const firstName = stringValue(input.firstName, 100); const lastName = stringValue(input.lastName, 100); const phone = input.phone?.trim() ? stringValue(input.phone, 40) : null;
  if (input.preferredContactMethod !== "email" && input.preferredContactMethod !== "phone") throw new ClientProfileServiceError("INVALID_VALUE", "Choose a valid preferred contact method.");
  const expected = new Date(input.expectedUpdatedAt); if (Number.isNaN(expected.getTime())) throw new ClientProfileServiceError("STALE", "Review the current client details and try again.");
  const db = getDb();
  return db.transaction(async (tx) => {
    const current = (await tx.select().from(clientProfiles).where(eq(clientProfiles.clientReference, input.clientReference)).limit(1))[0];
    if (!current) throw new ClientProfileServiceError("NOT_FOUND", "Client record not found.");
    if (current.updatedAt.getTime() !== expected.getTime()) throw new ClientProfileServiceError("STALE", "This client record changed while you were working. Review the current values and try again.");
    const nextValues: Record<EditableField, unknown> = { firstName, lastName, phone, preferredContactMethod: input.preferredContactMethod };
    const changedFields = EDITABLE_FIELDS.filter((field) => current[field] !== nextValues[field]);
    if (!changedFields.length) return current;
    const updated = (await tx.update(clientProfiles).set({ firstName, lastName, phone, preferredContactMethod: input.preferredContactMethod as "email" | "phone", updatedAt: new Date() }).where(and(eq(clientProfiles.id, current.id), eq(clientProfiles.updatedAt, current.updatedAt))).returning())[0];
    if (!updated) throw new ClientProfileServiceError("STALE", "This client record changed while you were working. Review the current values and try again.");
    const actor = (await tx.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.clerkUserId, input.actorClerkUserId)).limit(1))[0];
    await recordStaffAuditEvent(tx, { actorStaffUserId: actor?.id ?? null, actorType: "STAFF", action: "CLIENT_PROFILE_UPDATED", targetType: "CLIENT", targetReference: input.clientReference, metadata: { changedFields } });
    return updated;
  });
}
