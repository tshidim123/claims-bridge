import "server-only";

import { and, desc, eq, gt, lt, or } from "drizzle-orm";

import { messageSenderLabels } from "@/config/messaging";
import { hasPermissionForRole, type StaffPermission } from "@/config/staff";
import { claims } from "@/lib/db/schema/claims";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { emailOutbox } from "@/lib/db/schema/communications";
import { buildEmailOutboxValues } from "@/lib/communications/email";
import {
  claimConversations,
  claimMessageReads,
  claimMessages,
} from "@/lib/db/schema/messaging";
import { staffUsers } from "@/lib/db/schema/staff";
import { getDb } from "@/lib/db";
import { getStaffRecordByClerkId } from "@/lib/staff/authorization";
import { recordStaffAuditEvent, type StaffDbExecutor } from "@/lib/staff/audit";
import { requirePermission } from "@/lib/staff/authorization";
import {
  createControlledSystemMessageInTransaction,
  closeConversationInTransaction,
  reopenConversationInTransaction,
  sendClaimsBridgeMessageInTransaction,
  MessagingServiceError,
} from "@/lib/messaging/repository";

const PAGE_SIZE = 50;
type MessageCursor = { createdAt: string; id: string };

export class StaffMessagingError extends Error {
  constructor(
    public readonly code:
      | "CLAIM_NOT_FOUND"
      | "CONVERSATION_NOT_FOUND"
      | "FORBIDDEN"
      | "ARCHIVED"
      | "CONVERSATION_CLOSED"
      | "INVALID_MESSAGE"
      | "INVALID_CURSOR"
      | "CONCURRENT_CHANGE"
      | "CONFIRMATION_REQUIRED",
  ) {
    super(code);
    this.name = "StaffMessagingError";
  }
}

function encodeCursor(message: { id: string; createdAt: Date }) {
  return Buffer.from(
    JSON.stringify({
      id: message.id,
      createdAt: message.createdAt.toISOString(),
    }),
  ).toString("base64url");
}
function decodeCursor(value?: string): MessageCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<MessageCursor>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.createdAt !== "string" ||
      Number.isNaN(new Date(parsed.createdAt).getTime())
    )
      throw new Error();
    return { id: parsed.id, createdAt: parsed.createdAt };
  } catch {
    throw new StaffMessagingError("INVALID_CURSOR");
  }
}

async function actorInTransaction(
  executor: StaffDbExecutor,
  clerkUserId: string,
  permission: StaffPermission,
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
    !hasPermissionForRole(actor.role, permission)
  )
    throw new StaffMessagingError("FORBIDDEN");
  return actor;
}

async function claimConversation(
  executor: StaffDbExecutor,
  claimReference: string,
) {
  return (
    await executor
      .select({
        claimId: claims.id,
        clientReference: clientProfiles.clientReference,
        archivedAt: claims.archivedAt,
        conversationId: claimConversations.id,
        conversationStatus: claimConversations.status,
      })
      .from(claims)
      .innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId))
      .leftJoin(claimConversations, eq(claimConversations.claimId, claims.id))
      .where(eq(claims.claimReference, claimReference))
      .limit(1)
  )[0];
}

async function unreadForStaff(
  executor: StaffDbExecutor,
  conversationId: string,
  staffId: string,
) {
  const read = (
    await executor
      .select({
        lastReadAt: claimMessageReads.lastReadAt,
        lastReadMessageId: claimMessageReads.lastReadMessageId,
      })
      .from(claimMessageReads)
      .where(
        and(
          eq(claimMessageReads.conversationId, conversationId),
          eq(claimMessageReads.viewerType, "CLAIMS_BRIDGE"),
          eq(claimMessageReads.viewerId, staffId),
        ),
      )
      .limit(1)
  )[0];
  const conditions = [
    eq(claimMessages.conversationId, conversationId),
    eq(claimMessages.clientVisible, true),
    eq(claimMessages.senderType, "CLIENT"),
  ];
  if (read)
    conditions.push(
      read.lastReadMessageId
        ? or(
            gt(claimMessages.createdAt, read.lastReadAt),
            and(
              eq(claimMessages.createdAt, read.lastReadAt),
              gt(claimMessages.id, read.lastReadMessageId),
            )!,
          )!
        : gt(claimMessages.createdAt, read.lastReadAt),
    );
  const rows = await executor
    .select({ id: claimMessages.id })
    .from(claimMessages)
    .where(and(...conditions));
  return rows.length;
}

export async function getAdminClaimMessagingWorkspace(
  clerkUserId: string,
  claimReference: string,
  before?: string,
) {
  const context = await requirePermission(clerkUserId, "MESSAGES_VIEW");
  const staff = await getStaffRecordByClerkId(clerkUserId);
  if (!staff) throw new StaffMessagingError("FORBIDDEN");
  const cursor = decodeCursor(before);
  const db = getDb();
  const claim = await claimConversation(db, claimReference);
  if (!claim) throw new StaffMessagingError("CLAIM_NOT_FOUND");
  if (!claim.conversationId)
    return {
      claimReference,
      conversation: null,
      messages: [],
      nextCursor: null,
      unreadClientMessages: 0,
      canReply: context.permissions.includes("MESSAGES_REPLY"),
      canManageConversation: context.permissions.includes(
        "MESSAGES_MANAGE_CONVERSATION",
      ),
    };
  const conditions = [
    eq(claimMessages.conversationId, claim.conversationId),
    eq(claimMessages.clientVisible, true),
  ];
  if (cursor) {
    const date = new Date(cursor.createdAt);
    conditions.push(
      or(
        lt(claimMessages.createdAt, date),
        and(eq(claimMessages.createdAt, date), lt(claimMessages.id, cursor.id)),
      )!,
    );
  }
  const rows = await db
    .select({
      id: claimMessages.id,
      senderType: claimMessages.senderType,
      messageType: claimMessages.messageType,
      body: claimMessages.body,
      createdAt: claimMessages.createdAt,
    })
    .from(claimMessages)
    .where(and(...conditions))
    .orderBy(desc(claimMessages.createdAt), desc(claimMessages.id))
    .limit(PAGE_SIZE + 1);
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();
  return {
    claimReference,
    conversation: {
      status: claim.conversationStatus!,
      messageCount: rows.length,
    },
    messages: page.map((row) => ({
      id: row.id,
      sender:
        row.senderType === "CLIENT"
          ? "Client"
          : messageSenderLabels[row.senderType],
      messageType: row.messageType,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore && page[0] ? encodeCursor(page[0]) : null,
    unreadClientMessages: await unreadForStaff(
      db,
      claim.conversationId,
      staff.id,
    ),
    canReply:
      context.permissions.includes("MESSAGES_REPLY") &&
      claim.conversationStatus === "OPEN",
    canManageConversation: context.permissions.includes(
      "MESSAGES_MANAGE_CONVERSATION",
    ),
  };
}

export async function markAdminConversationRead(
  clerkUserId: string,
  claimReference: string,
) {
  await requirePermission(clerkUserId, "MESSAGES_VIEW");
  const staff = await getStaffRecordByClerkId(clerkUserId);
  if (!staff) throw new StaffMessagingError("FORBIDDEN");
  const db = getDb();
  const claim = await claimConversation(db, claimReference);
  if (!claim?.conversationId) return;
  const latest = (
    await db
      .select({ id: claimMessages.id, createdAt: claimMessages.createdAt })
      .from(claimMessages)
      .where(
        and(
          eq(claimMessages.conversationId, claim.conversationId),
          eq(claimMessages.clientVisible, true),
        ),
      )
      .orderBy(desc(claimMessages.createdAt), desc(claimMessages.id))
      .limit(1)
  )[0];
  if (!latest) return;
  await db
    .insert(claimMessageReads)
    .values({
      conversationId: claim.conversationId,
      viewerType: "CLAIMS_BRIDGE",
      viewerId: staff.id,
      lastReadMessageId: latest.id,
      lastReadAt: latest.createdAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        claimMessageReads.conversationId,
        claimMessageReads.viewerType,
        claimMessageReads.viewerId,
      ],
      set: {
        lastReadMessageId: latest.id,
        lastReadAt: latest.createdAt,
        updatedAt: new Date(),
      },
    });
}

async function requireClaimActor(
  executor: StaffDbExecutor,
  clerkUserId: string,
  claimReference: string,
  permission: StaffPermission,
) {
  const actor = await actorInTransaction(executor, clerkUserId, permission);
  const claim = await claimConversation(executor, claimReference);
  if (!claim) throw new StaffMessagingError("CLAIM_NOT_FOUND");
  if (claim.archivedAt) throw new StaffMessagingError("ARCHIVED");
  return { actor, claim };
}

export async function sendStaffClaimMessage(
  clerkUserId: string,
  claimReference: string,
  body: unknown,
  requestId?: string,
) {
  await requirePermission(clerkUserId, "MESSAGES_REPLY");
  const safeRequestId =
    requestId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
      ? requestId
      : undefined;
  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      const { actor, claim } = await requireClaimActor(
        tx,
        clerkUserId,
        claimReference,
        "MESSAGES_REPLY",
      );
      await tx
        .insert(claimConversations)
        .values({ claimId: claim.claimId, status: "OPEN" })
        .onConflictDoNothing({ target: claimConversations.claimId });
      const conversation = (
        await tx
          .select()
          .from(claimConversations)
          .where(eq(claimConversations.claimId, claim.claimId))
          .limit(1)
      )[0];
      if (!conversation)
        throw new StaffMessagingError("CONVERSATION_NOT_FOUND");
      const existing = safeRequestId
        ? (
            await tx
              .select()
              .from(claimMessages)
              .where(
                and(
                  eq(claimMessages.conversationId, conversation.id),
                  eq(claimMessages.clientRequestId, safeRequestId),
                ),
              )
              .limit(1)
          )[0]
        : undefined;
      if (existing) return { messageId: existing.id, created: false };
      const message = await sendClaimsBridgeMessageInTransaction(
        tx,
        conversation.id,
        body,
        safeRequestId,
      );
      await tx
        .insert(emailOutbox)
        .values(
          buildEmailOutboxValues({
            event: "NEW_SECURE_MESSAGE",
            recipient: {
              mode: "DEFERRED",
              recipientType: "CLIENT",
              recipientReference: claim.clientReference,
            },
            payload: {
              claimReference,
              messagesUrl: `/account/claims/${encodeURIComponent(claimReference)}/messages`,
            },
            dedupeKey: `NEW_SECURE_MESSAGE:${message.id}`,
          }),
        )
        .onConflictDoNothing({ target: emailOutbox.dedupeKey });
      await recordStaffAuditEvent(tx, {
        actorStaffUserId: actor.id,
        actorType: "STAFF",
        action: "CLAIM_MESSAGE_SENT",
        targetType: "CLAIM",
        targetReference: claimReference,
        metadata: { messageType: "MESSAGE", senderType: "CLAIMS_BRIDGE" },
      });
      return { messageId: message.id, created: true };
    });
  } catch (error) {
    if (error instanceof StaffMessagingError) throw error;
    if (error instanceof MessagingServiceError)
      throw new StaffMessagingError(
        error.code === "CONVERSATION_CLOSED"
          ? "CONVERSATION_CLOSED"
          : "INVALID_MESSAGE",
      );
    throw new StaffMessagingError("INVALID_MESSAGE");
  }
}

export async function setStaffConversationStatus(
  clerkUserId: string,
  claimReference: string,
  status: "OPEN" | "CLOSED",
  confirmed = false,
) {
  await requirePermission(clerkUserId, "MESSAGES_MANAGE_CONVERSATION");
  if (status === "CLOSED" && !confirmed)
    throw new StaffMessagingError("CONFIRMATION_REQUIRED");
  const db = getDb();
  return db.transaction(async (tx) => {
    const { actor, claim } = await requireClaimActor(
      tx,
      clerkUserId,
      claimReference,
      "MESSAGES_MANAGE_CONVERSATION",
    );
    if (!claim.conversationId)
      throw new StaffMessagingError("CONVERSATION_NOT_FOUND");
    let updated;
    try {
      updated =
        status === "CLOSED"
          ? await closeConversationInTransaction(tx, claim.conversationId)
          : await reopenConversationInTransaction(tx, claim.conversationId);
    } catch {
      throw new StaffMessagingError("CONCURRENT_CHANGE");
    }
    if (status === "OPEN")
      await createControlledSystemMessageInTransaction(
        tx,
        claim.conversationId,
        "CONVERSATION_REOPENED",
      );
    await recordStaffAuditEvent(tx, {
      actorStaffUserId: actor.id,
      actorType: "STAFF",
      action:
        status === "CLOSED"
          ? "CLAIM_CONVERSATION_CLOSED"
          : "CLAIM_CONVERSATION_REOPENED",
      targetType: "CLAIM",
      targetReference: claimReference,
      metadata: { toStatus: status },
    });
    return updated;
  });
}

export async function loadEarlierStaffMessages(
  clerkUserId: string,
  claimReference: string,
  before?: string,
) {
  return getAdminClaimMessagingWorkspace(clerkUserId, claimReference, before);
}
