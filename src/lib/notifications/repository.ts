import "server-only";

import { randomBytes } from "node:crypto";
import { cache } from "react";
import { and, asc, count, desc, eq, isNull, lt, or } from "drizzle-orm";

import {
  notificationDefinitions,
  notificationPreferenceConfig,
  resolveNotificationAction,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationContext,
  type NotificationType,
} from "@/config/notifications";
import { getClientProfileByClerkId } from "@/lib/clients/repository";
import { getDb } from "@/lib/db";
import { claims } from "@/lib/db/schema/claims";
import { clientNotificationPreferences, clientNotifications, type ClientNotification } from "@/lib/db/schema/notifications";

const PAGE_SIZE = 50;

type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<DbClient["transaction"]>[0] extends (tx: infer T, ...args: never[]) => unknown ? T : never;
type QueryExecutor = DbClient | DbTransaction;

export class NotificationServiceError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "INVALID_CURSOR" | "INVALID_PREFERENCE" | "ESSENTIAL_PREFERENCE", public readonly status: number, message: string) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

type NotificationCursor = { createdAt: string; id: string };

function encodeCursor(notification: Pick<ClientNotification, "id" | "createdAt">) {
  return Buffer.from(JSON.stringify({ createdAt: notification.createdAt.toISOString(), id: notification.id })).toString("base64url");
}

function decodeCursor(value: string | undefined): NotificationCursor | undefined {
  if (!value) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<NotificationCursor>;
    if (typeof decoded.createdAt !== "string" || typeof decoded.id !== "string" || Number.isNaN(new Date(decoded.createdAt).getTime())) throw new Error("invalid");
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    throw new NotificationServiceError("INVALID_CURSOR", 400, "This notification position is no longer available.");
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

function createNotificationReference() {
  return `NT-${randomBytes(10).toString("hex").toUpperCase()}`;
}

function isNotificationEnabled(category: NotificationCategory, enabled: boolean | undefined) {
  return notificationPreferenceConfig[category].essential || enabled !== false;
}

async function getPreference(executor: QueryExecutor, clientProfileId: string, category: NotificationCategory, channel: NotificationChannel = "IN_APP") {
  return (await executor.select({ enabled: clientNotificationPreferences.enabled }).from(clientNotificationPreferences).where(and(eq(clientNotificationPreferences.clientProfileId, clientProfileId), eq(clientNotificationPreferences.category, category), eq(clientNotificationPreferences.channel, channel))).limit(1))[0]?.enabled;
}

export type CreateNotificationInput = {
  clientProfileId: string;
  claimId?: string | null;
  type: NotificationType;
  context?: NotificationContext;
  actionReference?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  dedupeKey?: string | null;
  createdAt?: Date;
};

export async function createNotification(executor: QueryExecutor, input: CreateNotificationInput) {
  const definition = notificationDefinitions[input.type];
  const enabled = await getPreference(executor, input.clientProfileId, definition.category);
  if (!isNotificationEnabled(definition.category, enabled)) return null;
  const createdAt = input.createdAt ?? new Date();
  const values = {
    notificationReference: createNotificationReference(),
    clientProfileId: input.clientProfileId,
    claimId: input.claimId ?? null,
    type: definition.id,
    category: definition.category,
    title: definition.title,
    body: definition.body(input.context ?? {}),
    priority: definition.priority,
    actionType: definition.actionType ?? null,
    actionReference: input.actionReference ?? null,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    dedupeKey: input.dedupeKey ?? null,
    createdAt,
  };
  if (input.dedupeKey) {
    const existing = (await executor.select().from(clientNotifications).where(eq(clientNotifications.dedupeKey, input.dedupeKey)).limit(1))[0];
    if (existing) return existing;
  }
  try {
    const inserted = (await executor.insert(clientNotifications).values(values).onConflictDoNothing({ target: clientNotifications.dedupeKey }).returning())[0];
    if (inserted) return inserted;
    if (input.dedupeKey) return (await executor.select().from(clientNotifications).where(eq(clientNotifications.dedupeKey, input.dedupeKey)).limit(1))[0] ?? null;
    return null;
  } catch (error) {
    if (isUniqueViolation(error) && input.dedupeKey) return (await executor.select().from(clientNotifications).where(eq(clientNotifications.dedupeKey, input.dedupeKey)).limit(1))[0] ?? null;
    throw error;
  }
}

export async function createClaimNotification(executor: QueryExecutor, input: Omit<CreateNotificationInput, "clientProfileId" | "claimId" | "actionReference"> & { claimId: string; actionReference?: string | null }) {
  const claim = (await executor.select({ id: claims.id, clientProfileId: claims.clientProfileId, claimReference: claims.claimReference }).from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
  if (!claim) return null;
  return createNotification(executor, {
    ...input,
    clientProfileId: claim.clientProfileId,
    claimId: claim.id,
    actionReference: input.actionReference ?? claim.claimReference,
  });
}

export async function createClaimNotificationInTransaction(executor: QueryExecutor, input: Omit<CreateNotificationInput, "clientProfileId" | "claimId" | "actionReference"> & { claimId: string; actionReference?: string | null }) {
  return createClaimNotification(executor, input);
}

export async function markNotificationRead(clerkUserId: string, notificationReference: string) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) throw new NotificationServiceError("NOT_FOUND", 404, "Notification not found.");
  const db = getDb();
  const updated = (await db.update(clientNotifications).set({ readAt: new Date() }).where(and(eq(clientNotifications.notificationReference, notificationReference), eq(clientNotifications.clientProfileId, profile.id))).returning({ id: clientNotifications.id }))[0];
  if (!updated) throw new NotificationServiceError("NOT_FOUND", 404, "Notification not found.");
  return updated;
}

export async function markAllNotificationsRead(clerkUserId: string) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return 0;
  const db = getDb();
  const rows = await db.update(clientNotifications).set({ readAt: new Date() }).where(and(eq(clientNotifications.clientProfileId, profile.id), isNull(clientNotifications.readAt))).returning({ id: clientNotifications.id });
  return rows.length;
}

async function getNotifications(executor: QueryExecutor, clientProfileId: string, before?: string) {
  const cursor = decodeCursor(before);
  const conditions = [eq(clientNotifications.clientProfileId, clientProfileId), isNull(clientNotifications.archivedAt)];
  if (cursor) {
    const date = new Date(cursor.createdAt);
    conditions.push(or(lt(clientNotifications.createdAt, date), and(eq(clientNotifications.createdAt, date), lt(clientNotifications.id, cursor.id)))!);
  }
  const rows = await executor.select().from(clientNotifications).where(and(...conditions)).orderBy(desc(clientNotifications.createdAt), desc(clientNotifications.id)).limit(PAGE_SIZE + 1);
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();
  return { notifications: page, nextCursor: hasMore && page[0] ? encodeCursor(page[0]) : null };
}

export async function getNotificationsForClient(clerkUserId: string, before?: string) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return { notifications: [], nextCursor: null, unreadCount: 0 };
  const db = getDb();
  const page = await getNotifications(db, profile.id, before);
  const unreadCount = await getUnreadNotificationCountForProfile(db, profile.id);
  return { ...page, unreadCount };
}

export async function getUnreadNotificationCountForProfile(executor: QueryExecutor, clientProfileId: string) {
  const [result] = await executor.select({ count: count() }).from(clientNotifications).where(and(eq(clientNotifications.clientProfileId, clientProfileId), isNull(clientNotifications.readAt), isNull(clientNotifications.archivedAt)));
  return Number(result?.count ?? 0);
}

export const getUnreadNotificationCount = cache(async function getUnreadNotificationCount(clerkUserId: string) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return 0;
  return getUnreadNotificationCountForProfile(getDb(), profile.id);
});

export async function getRecentNotificationsForClient(clerkUserId: string, limit = 3) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return [];
  return getDb().select().from(clientNotifications).where(and(eq(clientNotifications.clientProfileId, profile.id), isNull(clientNotifications.archivedAt))).orderBy(desc(clientNotifications.createdAt), desc(clientNotifications.id)).limit(limit);
}

export async function getNotificationPreferencesForClient(clerkUserId: string) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return [];
  const rows = await getDb().select().from(clientNotificationPreferences).where(eq(clientNotificationPreferences.clientProfileId, profile.id)).orderBy(asc(clientNotificationPreferences.category));
  return Object.keys(notificationPreferenceConfig).map((category) => {
    const typedCategory = category as NotificationCategory;
    const stored = rows.find((row) => row.category === typedCategory && row.channel === "IN_APP");
    return { category: typedCategory, channel: "IN_APP" as const, enabled: stored?.enabled ?? notificationPreferenceConfig[typedCategory].defaultEnabled, ...notificationPreferenceConfig[typedCategory] };
  });
}

export async function setInAppNotificationPreference(clerkUserId: string, category: string, enabled: boolean) {
  if (!(category in notificationPreferenceConfig)) throw new NotificationServiceError("INVALID_PREFERENCE", 400, "This notification preference is not available.");
  const typedCategory = category as NotificationCategory;
  if (notificationPreferenceConfig[typedCategory].essential && !enabled) throw new NotificationServiceError("ESSENTIAL_PREFERENCE", 400, "Essential Claims Bridge notifications cannot be turned off.");
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) throw new NotificationServiceError("NOT_FOUND", 404, "Account not found.");
  const db = getDb();
  const updatedAt = new Date();
  return (await db.insert(clientNotificationPreferences).values({ clientProfileId: profile.id, category: typedCategory, channel: "IN_APP", enabled, updatedAt }).onConflictDoUpdate({ target: [clientNotificationPreferences.clientProfileId, clientNotificationPreferences.category, clientNotificationPreferences.channel], set: { enabled, updatedAt } }).returning())[0];
}

export function serializeNotification(notification: ClientNotification) {
  return {
    notificationReference: notification.notificationReference,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    priority: notification.priority,
    actionHref: resolveNotificationAction(notification.actionType, notification.actionReference),
    claimReference: notification.actionReference && notification.claimId ? notification.actionReference : null,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}

export async function getNotificationForClient(clerkUserId: string, notificationReference: string) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return undefined;
  return (await getDb().select().from(clientNotifications).where(and(eq(clientNotifications.notificationReference, notificationReference), eq(clientNotifications.clientProfileId, profile.id), isNull(clientNotifications.archivedAt))).limit(1))[0];
}

export async function getNotificationSummaryForClient(clerkUserId: string) {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return { unreadCount: 0, recent: [] };
  const db = getDb();
  const [unreadCount, recent] = await Promise.all([getUnreadNotificationCountForProfile(db, profile.id), getRecentNotificationsForClient(clerkUserId, 3)]);
  return { unreadCount, recent };
}
