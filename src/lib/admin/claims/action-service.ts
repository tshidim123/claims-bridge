import "server-only";

import { and, eq } from "drizzle-orm";

import {
  clientActionConfig,
  clientActionDescriptionSchema,
  clientActionTitleSchema,
  isClientActionPriority,
  isClientActionType,
  type ClientActionPriority,
  type ClientActionType,
} from "@/config/client-actions";
import { createClientActionReference } from "@/lib/actions/keys";
import { getDb } from "@/lib/db";
import { claimActionRequirements } from "@/lib/db/schema/actions";
import { claims } from "@/lib/db/schema/claims";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { emailOutbox } from "@/lib/db/schema/communications";
import { buildEmailOutboxValues } from "@/lib/communications/email";
import { staffUsers } from "@/lib/db/schema/staff";
import { recordStaffAuditEvent, type StaffDbExecutor } from "@/lib/staff/audit";
import { hasPermissionForRole } from "@/config/staff";
import { requirePermission } from "@/lib/staff/authorization";
import { createClaimNotificationInTransaction } from "@/lib/notifications/repository";

export class StaffActionError extends Error {
  constructor(
    public readonly code:
      | "CLAIM_NOT_FOUND"
      | "ACTION_NOT_FOUND"
      | "INVALID_TYPE"
      | "INVALID_PRIORITY"
      | "INVALID_TITLE"
      | "INVALID_DESCRIPTION"
      | "INVALID_DUE_DATE"
      | "TERMINAL_CLAIM"
      | "ARCHIVED"
      | "INVALID_STATUS"
      | "CONCURRENT_CHANGE"
      | "FORBIDDEN",
  ) {
    super(code);
    this.name = "StaffActionError";
  }
}

function parseDueDate(value?: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new StaffActionError("INVALID_DUE_DATE");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new StaffActionError("INVALID_DUE_DATE");
  return date;
}

async function actorInTransaction(
  executor: StaffDbExecutor,
  clerkUserId: string,
) {
  const actor = (
    await executor
      .select({
        id: staffUsers.id,
        role: staffUsers.role,
        status: staffUsers.status,
      })
      .from(staffUsers)
      .where(eq(staffUsers.clerkUserId, clerkUserId))
      .limit(1)
  )[0];
  if (
    !actor ||
    actor.status !== "ACTIVE" ||
    !hasPermissionForRole(actor.role, "CLAIMS_MANAGE")
  )
    throw new StaffActionError("FORBIDDEN");
  return actor;
}

async function claimByReference(
  executor: StaffDbExecutor,
  claimReference: string,
) {
  return (
    await executor
      .select({
        id: claims.id,
        status: claims.status,
        archivedAt: claims.archivedAt,
        clientReference: clientProfiles.clientReference,
      })
      .from(claims)
      .innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId))
      .where(eq(claims.claimReference, claimReference))
      .limit(1)
  )[0];
}

function terminal(status: string) {
  return ["COMPLETED", "CLOSED", "NOT_ELIGIBLE"].includes(status);
}

export async function createClientActionRequirement(
  clerkUserId: string,
  claimReference: string,
  input: {
    type: string;
    title: string;
    description: string;
    priority?: string;
    dueDate?: string;
    requestId?: string;
  },
) {
  await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  const requestId =
    input.requestId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.requestId,
    )
      ? input.requestId
      : undefined;
  if (!isClientActionType(input.type))
    throw new StaffActionError("INVALID_TYPE");
  if (!clientActionTitleSchema.safeParse(input.title).success)
    throw new StaffActionError("INVALID_TITLE");
  if (!clientActionDescriptionSchema.safeParse(input.description).success)
    throw new StaffActionError("INVALID_DESCRIPTION");
  if (input.priority && !isClientActionPriority(input.priority))
    throw new StaffActionError("INVALID_PRIORITY");
  const dueAt = parseDueDate(input.dueDate);
  const db = getDb();
  return db.transaction(async (tx) => {
    const actor = await actorInTransaction(tx, clerkUserId);
    const claim = await claimByReference(tx, claimReference);
    if (!claim) throw new StaffActionError("CLAIM_NOT_FOUND");
    if (claim.archivedAt) throw new StaffActionError("ARCHIVED");
    if (terminal(claim.status)) throw new StaffActionError("TERMINAL_CLAIM");
    if (requestId) {
      const existing = (
        await tx
          .select({ actionReference: claimActionRequirements.actionReference })
          .from(claimActionRequirements)
          .where(
            and(
              eq(claimActionRequirements.claimId, claim.id),
              eq(claimActionRequirements.clientRequestId, requestId),
            ),
          )
          .limit(1)
      )[0];
      if (existing) return existing;
    }
    const now = new Date();
    const action = (
      await tx
        .insert(claimActionRequirements)
        .values({
          actionReference: createClientActionReference(),
          clientRequestId: requestId ?? null,
          claimId: claim.id,
          type: input.type as ClientActionType,
          title: input.title.trim(),
          description: input.description.trim(),
          priority:
            (input.priority as ClientActionPriority | undefined) ?? "NORMAL",
          clientVisible: true,
          dueAt,
          createdAt: now,
          updatedAt: now,
          createdByStaffUserId: actor.id,
        })
        .returning()
    )[0];
    if (!action) throw new StaffActionError("CONCURRENT_CHANGE");
    const dueDate = action.dueAt
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(action.dueAt)
      : null;
    await tx
      .insert(emailOutbox)
      .values(
        buildEmailOutboxValues({
          event: "CLIENT_ACTION_REQUIRED",
          recipient: {
            mode: "DEFERRED",
            recipientType: "CLIENT",
            recipientReference: claim.clientReference,
          },
          payload: {
            claimReference,
            actionReference: action.actionReference,
            title: action.title,
            description: action.description,
            dueDate,
            actionUrl: `/account/claims/${encodeURIComponent(claimReference)}`,
          },
          dedupeKey: `CLIENT_ACTION_REQUIRED:${action.actionReference}`,
        }),
      )
      .onConflictDoNothing({ target: emailOutbox.dedupeKey });
    await createClaimNotificationInTransaction(tx, {
      claimId: claim.id,
      type: "CLIENT_ACTION_REQUIRED",
      sourceType: "CLIENT_ACTION",
      sourceId: action.id,
      actionReference: claimReference,
      dedupeKey: `client-action-required:${action.actionReference}`,
    });
    await recordStaffAuditEvent(tx, {
      actorStaffUserId: actor.id,
      actorType: "STAFF",
      action: "CLIENT_ACTION_CREATED",
      targetType: "CLAIM",
      targetReference: claimReference,
      metadata: {
        actionReference: action.actionReference,
        actionType: action.type,
        priority: action.priority,
      },
    });
    return { actionReference: action.actionReference };
  });
}

async function changeAction(
  clerkUserId: string,
  claimReference: string,
  actionReference: string,
  nextStatus: "COMPLETED" | "CANCELLED",
) {
  await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const actor = await actorInTransaction(tx, clerkUserId);
    const claim = await claimByReference(tx, claimReference);
    if (!claim) throw new StaffActionError("CLAIM_NOT_FOUND");
    if (claim.archivedAt) throw new StaffActionError("ARCHIVED");
    const current = (
      await tx
        .select()
        .from(claimActionRequirements)
        .where(
          and(
            eq(claimActionRequirements.claimId, claim.id),
            eq(claimActionRequirements.actionReference, actionReference),
          ),
        )
        .limit(1)
    )[0];
    if (!current) throw new StaffActionError("ACTION_NOT_FOUND");
    if (current.status !== "OPEN") throw new StaffActionError("INVALID_STATUS");
    const now = new Date();
    const updated = (
      await tx
        .update(claimActionRequirements)
        .set({
          status: nextStatus,
          completedAt: nextStatus === "COMPLETED" ? now : null,
          cancelledAt: nextStatus === "CANCELLED" ? now : null,
          updatedAt: now,
        })
        .where(
          and(
            eq(claimActionRequirements.id, current.id),
            eq(claimActionRequirements.status, "OPEN"),
          ),
        )
        .returning()
    )[0];
    if (!updated) throw new StaffActionError("CONCURRENT_CHANGE");
    await recordStaffAuditEvent(tx, {
      actorStaffUserId: actor.id,
      actorType: "STAFF",
      action:
        nextStatus === "COMPLETED"
          ? "CLIENT_ACTION_COMPLETED"
          : "CLIENT_ACTION_CANCELLED",
      targetType: "CLAIM",
      targetReference: claimReference,
      metadata: {
        actionReference,
        actionType: current.type,
        priority: current.priority,
      },
    });
    return updated;
  });
}

export function completeClientActionForStaff(
  clerkUserId: string,
  claimReference: string,
  actionReference: string,
) {
  return changeAction(
    clerkUserId,
    claimReference,
    actionReference,
    "COMPLETED",
  );
}
export function cancelClientActionForStaff(
  clerkUserId: string,
  claimReference: string,
  actionReference: string,
) {
  return changeAction(
    clerkUserId,
    claimReference,
    actionReference,
    "CANCELLED",
  );
}

export function defaultClientActionDescription(type: string) {
  return isClientActionType(type) ? clientActionConfig[type].description : "";
}
