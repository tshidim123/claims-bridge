import "server-only";

import { and, count, desc, eq, gt, lt, or } from "drizzle-orm";

import { parseMessageBody } from "@/config/messaging";
import {
  controlledSystemMessages,
  type ControlledSystemMessageType,
} from "@/config/staff-messaging";
import { getClientProfileByClerkId } from "@/lib/clients/repository";
import { getClaimForClient } from "@/lib/claims/repository";
import { getDb } from "@/lib/db";
import { claims } from "@/lib/db/schema/claims";
import {
  claimConversations,
  claimMessageReads,
  claimMessages,
  type ClaimConversation,
  type ClaimMessage,
} from "@/lib/db/schema/messaging";
import { createClaimNotificationInTransaction } from "@/lib/notifications/repository";
import { emitStaffCommunicationInTransaction } from "@/lib/communications/staff-notifications";

const PAGE_SIZE = 50;
const CLIENT_VIEWER = "CLIENT" as const;
type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<DbClient["transaction"]>[0] extends (
  tx: infer T,
  ...args: never[]
) => unknown
  ? T
  : never;
export type MessagingDbExecutor = DbClient | DbTransaction;

export class MessagingServiceError extends Error {
  constructor(
    public readonly code:
      | "CLAIM_NOT_FOUND"
      | "CLAIM_ARCHIVED"
      | "CONVERSATION_NOT_FOUND"
      | "CONVERSATION_CLOSED"
      | "INVALID_MESSAGE"
      | "MESSAGE_NOT_FOUND"
      | "INVALID_CURSOR",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MessagingServiceError";
  }
}

type MessageCursor = { createdAt: string; id: string };

function encodeCursor(message: Pick<ClaimMessage, "id" | "createdAt">) {
  return Buffer.from(
    JSON.stringify({
      createdAt: message.createdAt.toISOString(),
      id: message.id,
    }),
  ).toString("base64url");
}

function decodeCursor(value: string | undefined): MessageCursor | undefined {
  if (!value) return undefined;
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<MessageCursor>;
    if (
      typeof decoded.createdAt !== "string" ||
      typeof decoded.id !== "string" ||
      Number.isNaN(new Date(decoded.createdAt).getTime())
    )
      throw new Error("invalid");
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    throw new MessagingServiceError(
      "INVALID_CURSOR",
      400,
      "This message position is no longer available.",
    );
  }
}

async function getOwnedContext(clerkUserId: string, claimReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned)
    throw new MessagingServiceError("CLAIM_NOT_FOUND", 404, "Claim not found.");
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile)
    throw new MessagingServiceError("CLAIM_NOT_FOUND", 404, "Claim not found.");
  return { ...owned, profile };
}

export async function getClaimConversationForClient(
  clerkUserId: string,
  claimReference: string,
) {
  const owned = await getOwnedContext(clerkUserId, claimReference);
  const db = getDb();
  const conversation = (
    await db
      .select()
      .from(claimConversations)
      .where(eq(claimConversations.claimId, owned.claim.id))
      .limit(1)
  )[0];
  return conversation ? { ...owned, conversation } : undefined;
}

export async function getOrCreateClaimConversationForClient(
  clerkUserId: string,
  claimReference: string,
) {
  const owned = await getOwnedContext(clerkUserId, claimReference);
  const db = getDb();
  const conversation = await db.transaction(async (tx) => {
    await tx
      .insert(claimConversations)
      .values({ claimId: owned.claim.id, status: "OPEN" })
      .onConflictDoNothing({ target: claimConversations.claimId });
    return (
      await tx
        .select()
        .from(claimConversations)
        .where(eq(claimConversations.claimId, owned.claim.id))
        .limit(1)
    )[0];
  });
  if (!conversation)
    throw new MessagingServiceError(
      "CONVERSATION_NOT_FOUND",
      404,
      "This conversation is not available.",
    );
  return { ...owned, conversation };
}

async function getMessagesForConversation(
  conversationId: string,
  before?: string,
) {
  const cursor = decodeCursor(before);
  const db = getDb();
  const conditions = [
    eq(claimMessages.conversationId, conversationId),
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
    .select()
    .from(claimMessages)
    .where(and(...conditions))
    .orderBy(desc(claimMessages.createdAt), desc(claimMessages.id))
    .limit(PAGE_SIZE + 1);
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();
  return {
    messages: page,
    nextCursor: hasMore && page[0] ? encodeCursor(page[0]) : null,
  };
}

export async function getClaimMessagesForClient(
  clerkUserId: string,
  claimReference: string,
  before?: string,
) {
  const context = await getClaimConversationForClient(
    clerkUserId,
    claimReference,
  );
  if (!context)
    return {
      conversation: undefined,
      messages: [],
      nextCursor: null,
      unreadCount: 0,
    };
  const page = await getMessagesForConversation(
    context.conversation.id,
    before,
  );
  const unreadCount = await getUnreadCount(
    context.conversation.id,
    context.profile.id,
  );
  return { conversation: context.conversation, ...page, unreadCount };
}

async function getUnreadCount(conversationId: string, viewerId: string) {
  const db = getDb();
  const read = (
    await db
      .select({
        lastReadAt: claimMessageReads.lastReadAt,
        lastReadMessageId: claimMessageReads.lastReadMessageId,
      })
      .from(claimMessageReads)
      .where(
        and(
          eq(claimMessageReads.conversationId, conversationId),
          eq(claimMessageReads.viewerType, CLIENT_VIEWER),
          eq(claimMessageReads.viewerId, viewerId),
        ),
      )
      .limit(1)
  )[0];
  const incomingConditions = [
    eq(claimMessages.conversationId, conversationId),
    eq(claimMessages.clientVisible, true),
    or(
      eq(claimMessages.senderType, "CLAIMS_BRIDGE"),
      eq(claimMessages.senderType, "SYSTEM"),
    )!,
  ];
  if (read)
    incomingConditions.push(
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
  const [result] = await db
    .select({ count: count() })
    .from(claimMessages)
    .where(and(...incomingConditions));
  return Number(result?.count ?? 0);
}

export async function markClaimConversationReadForClient(
  clerkUserId: string,
  claimReference: string,
) {
  const context = await getOrCreateClaimConversationForClient(
    clerkUserId,
    claimReference,
  );
  const db = getDb();
  const latest = (
    await db
      .select({ id: claimMessages.id, createdAt: claimMessages.createdAt })
      .from(claimMessages)
      .where(
        and(
          eq(claimMessages.conversationId, context.conversation.id),
          eq(claimMessages.clientVisible, true),
        ),
      )
      .orderBy(desc(claimMessages.createdAt), desc(claimMessages.id))
      .limit(1)
  )[0];
  if (!latest) return context.conversation;
  const now = new Date();
  await db
    .insert(claimMessageReads)
    .values({
      conversationId: context.conversation.id,
      viewerType: CLIENT_VIEWER,
      viewerId: context.profile.id,
      lastReadMessageId: latest.id,
      lastReadAt: latest.createdAt,
      updatedAt: now,
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
        updatedAt: now,
      },
    });
  return context.conversation;
}

export async function createClientMessageForClaim(
  clerkUserId: string,
  claimReference: string,
  input: { body: unknown; requestId?: string },
) {
  const context = await getOrCreateClaimConversationForClient(
    clerkUserId,
    claimReference,
  );
  if (context.claim.archivedAt)
    throw new MessagingServiceError(
      "CLAIM_ARCHIVED",
      409,
      "This archived claim is read-only.",
    );
  let body: string;
  try {
    body = parseMessageBody({ body: input.body });
  } catch (error) {
    throw new MessagingServiceError(
      "INVALID_MESSAGE",
      400,
      error instanceof Error
        ? error.message
        : "Please check your message and try again.",
    );
  }
  const requestId =
    typeof input.requestId === "string" && input.requestId.length <= 100
      ? input.requestId
      : null;
  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      const conversation = (
        await tx
          .select()
          .from(claimConversations)
          .where(eq(claimConversations.id, context.conversation.id))
          .limit(1)
      )[0];
      if (!conversation)
        throw new MessagingServiceError(
          "CONVERSATION_NOT_FOUND",
          404,
          "This conversation is not available.",
        );
      if (conversation.status !== "OPEN")
        throw new MessagingServiceError(
          "CONVERSATION_CLOSED",
          409,
          "This conversation is closed and cannot receive new messages.",
        );
      if (requestId) {
        const existing = (
          await tx
            .select()
            .from(claimMessages)
            .where(
              and(
                eq(claimMessages.conversationId, conversation.id),
                eq(claimMessages.clientRequestId, requestId),
              ),
            )
            .limit(1)
        )[0];
        if (existing) return existing;
      }
      const now = new Date();
      const message = (
        await tx
          .insert(claimMessages)
          .values({
            conversationId: conversation.id,
            senderType: "CLIENT",
            messageType: "MESSAGE",
            body,
            clientVisible: true,
            clientRequestId: requestId,
            createdAt: now,
          })
          .returning()
      )[0];
      await tx
        .update(claimConversations)
        .set({ lastMessageAt: now, updatedAt: now })
        .where(eq(claimConversations.id, conversation.id));
      await emitStaffCommunicationInTransaction(tx, {
        event: "CLIENT_MESSAGE_RECEIVED",
        reference: claimReference,
        summary:
          "A client has sent a new secure message. View it in Claims Bridge.",
        destination: `/admin/claims/${encodeURIComponent(claimReference)}/messages`,
        dedupeScope: message.id,
        claimId: context.claim.id,
      });
      return message;
    });
  } catch (error) {
    if (error instanceof MessagingServiceError) throw error;
    if (
      requestId &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      const existing = (
        await db
          .select()
          .from(claimMessages)
          .where(
            and(
              eq(claimMessages.conversationId, context.conversation.id),
              eq(claimMessages.clientRequestId, requestId),
            ),
          )
          .limit(1)
      )[0];
      if (existing) return existing;
    }
    throw new MessagingServiceError(
      "INVALID_MESSAGE",
      503,
      "We couldn't send your message. Please try again.",
    );
  }
}

export async function sendClaimsBridgeMessageInTransaction(
  executor: MessagingDbExecutor,
  conversationId: string,
  body: unknown,
  requestId?: string,
) {
  let messageBody: string;
  try {
    messageBody = parseMessageBody({ body });
  } catch (error) {
    throw new MessagingServiceError(
      "INVALID_MESSAGE",
      400,
      error instanceof Error
        ? error.message
        : "Please check your message and try again.",
    );
  }
  const conversation = (
    await executor
      .select()
      .from(claimConversations)
      .where(eq(claimConversations.id, conversationId))
      .limit(1)
  )[0];
  if (!conversation)
    throw new MessagingServiceError(
      "CONVERSATION_NOT_FOUND",
      404,
      "This conversation is not available.",
    );
  if (conversation.status !== "OPEN")
    throw new MessagingServiceError(
      "CONVERSATION_CLOSED",
      409,
      "This conversation is closed and cannot receive new messages.",
    );
  if (requestId) {
    const existing = (
      await executor
        .select()
        .from(claimMessages)
        .where(
          and(
            eq(claimMessages.conversationId, conversationId),
            eq(claimMessages.clientRequestId, requestId),
          ),
        )
        .limit(1)
    )[0];
    if (existing) return existing;
  }
  const now = new Date();
  const message = (
    await executor
      .insert(claimMessages)
      .values({
        conversationId,
        senderType: "CLAIMS_BRIDGE",
        messageType: "MESSAGE",
        body: messageBody,
        clientVisible: true,
        clientRequestId: requestId ?? null,
        createdAt: now,
      })
      .returning()
  )[0];
  await executor
    .update(claimConversations)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(
      and(
        eq(claimConversations.id, conversationId),
        eq(claimConversations.status, "OPEN"),
      ),
    );
  await createClaimNotificationInTransaction(executor, {
    claimId: conversation.claimId,
    type: "NEW_MESSAGE",
    sourceType: "MESSAGE",
    sourceId: message.id,
    dedupeKey: `message:${message.id}`,
  });
  return message;
}

export async function closeConversationInTransaction(
  executor: MessagingDbExecutor,
  conversationId: string,
) {
  const updated = (
    await executor
      .update(claimConversations)
      .set({ status: "CLOSED", updatedAt: new Date() })
      .where(
        and(
          eq(claimConversations.id, conversationId),
          eq(claimConversations.status, "OPEN"),
        ),
      )
      .returning()
  )[0];
  if (!updated)
    throw new MessagingServiceError(
      "CONVERSATION_CLOSED",
      409,
      "This conversation changed before it could be closed.",
    );
  return updated;
}

export async function reopenConversationInTransaction(
  executor: MessagingDbExecutor,
  conversationId: string,
) {
  const updated = (
    await executor
      .update(claimConversations)
      .set({ status: "OPEN", updatedAt: new Date() })
      .where(
        and(
          eq(claimConversations.id, conversationId),
          eq(claimConversations.status, "CLOSED"),
        ),
      )
      .returning()
  )[0];
  if (!updated)
    throw new MessagingServiceError(
      "INVALID_MESSAGE",
      409,
      "This conversation is already open or changed before it could be reopened.",
    );
  return updated;
}

export async function createControlledSystemMessageInTransaction(
  executor: MessagingDbExecutor,
  conversationId: string,
  type: ControlledSystemMessageType,
) {
  const conversation = (
    await executor
      .select({ id: claimConversations.id })
      .from(claimConversations)
      .where(eq(claimConversations.id, conversationId))
      .limit(1)
  )[0];
  if (!conversation)
    throw new MessagingServiceError(
      "CONVERSATION_NOT_FOUND",
      404,
      "This conversation is not available.",
    );
  const now = new Date();
  const message = (
    await executor
      .insert(claimMessages)
      .values({
        conversationId,
        senderType: "SYSTEM",
        messageType: "SYSTEM_UPDATE",
        body: controlledSystemMessages[type].body,
        clientVisible: true,
        createdAt: now,
      })
      .returning()
  )[0];
  await executor
    .update(claimConversations)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(claimConversations.id, conversationId));
  return message;
}

export async function getMessageIndexForClient(clerkUserId: string) {
  const db = getDb();
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return [];
  const conversations = await db
    .select()
    .from(claimConversations)
    .innerJoin(claims, eq(claims.id, claimConversations.claimId))
    .where(eq(claims.clientProfileId, profile.id))
    .orderBy(
      desc(claimConversations.lastMessageAt),
      desc(claimConversations.createdAt),
    );
  return Promise.all(
    conversations.map(
      async ({ claim_conversations: conversation, claims: claim }) => {
        const latest = (
          await db
            .select()
            .from(claimMessages)
            .where(
              and(
                eq(claimMessages.conversationId, conversation.id),
                eq(claimMessages.clientVisible, true),
              ),
            )
            .orderBy(desc(claimMessages.createdAt), desc(claimMessages.id))
            .limit(1)
        )[0];
        return {
          conversation,
          claimReference: claim.claimReference,
          latestMessage: latest
            ? {
                body: latest.body,
                senderType: latest.senderType,
                createdAt: latest.createdAt,
              }
            : null,
          unreadCount: await getUnreadCount(conversation.id, profile.id),
        };
      },
    ),
  );
}

export async function getUnreadMessageCountsForClient(clerkUserId: string) {
  const index = await getMessageIndexForClient(clerkUserId);
  return Object.fromEntries(
    index.map((item) => [item.conversation.claimId, item.unreadCount]),
  );
}

export async function getClaimMessagingSummaryForClient(
  clerkUserId: string,
  claimReference: string,
) {
  const context = await getClaimConversationForClient(
    clerkUserId,
    claimReference,
  );
  if (!context) return undefined;
  return {
    unreadCount: await getUnreadCount(
      context.conversation.id,
      context.profile.id,
    ),
    conversationStatus: context.conversation.status,
  };
}

export function serializeMessage(message: ClaimMessage) {
  return {
    id: message.id,
    senderType: message.senderType,
    messageType: message.messageType,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

export type MessageIndexItem = Awaited<
  ReturnType<typeof getMessageIndexForClient>
>[number];
export type MessageWorkspace = {
  conversation: ClaimConversation;
  messages: ReturnType<typeof serializeMessage>[];
  nextCursor: string | null;
  unreadCount: number;
};
