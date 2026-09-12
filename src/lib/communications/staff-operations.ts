import "server-only";
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  emailDeliveryEvents,
  emailOutbox,
  emailSuppressions,
  staffNotificationPreferences,
  staffNotifications,
} from "@/lib/db/schema/communications";
import {
  getStaffRecordByClerkId,
  requirePermission,
} from "@/lib/staff/authorization";
import { recordStaffAuditEvent } from "@/lib/staff/audit";
import { canManuallyRetry, isSafeEmailReference } from "./policy";

async function currentStaff(clerkUserId: string) {
  const staff = await getStaffRecordByClerkId(clerkUserId);
  if (!staff || staff.status !== "ACTIVE")
    throw new Error("Staff access required.");
  return staff;
}
export async function getStaffNotificationSummary(clerkUserId: string) {
  const staff = await currentStaff(clerkUserId);
  const db = getDb();
  const unread = await db
    .select({ count: count() })
    .from(staffNotifications)
    .where(
      and(
        eq(staffNotifications.staffUserId, staff.id),
        isNull(staffNotifications.readAt),
      ),
    );
  const recent = await db
    .select()
    .from(staffNotifications)
    .where(eq(staffNotifications.staffUserId, staff.id))
    .orderBy(desc(staffNotifications.createdAt), desc(staffNotifications.id))
    .limit(8);
  return { unread: Number(unread[0]?.count ?? 0), recent };
}
export async function markStaffNotificationRead(
  clerkUserId: string,
  reference: string,
  read = true,
) {
  const staff = await currentStaff(clerkUserId);
  const rows = await getDb()
    .update(staffNotifications)
    .set({ readAt: read ? new Date() : null })
    .where(
      and(
        eq(staffNotifications.notificationReference, reference),
        eq(staffNotifications.staffUserId, staff.id),
      ),
    )
    .returning({ id: staffNotifications.id });
  if (!rows[0]) throw new Error("Notification not found.");
}
export async function openStaffNotification(
  clerkUserId: string,
  reference: string,
) {
  const staff = await currentStaff(clerkUserId);
  const row = (
    await getDb()
      .select({ destination: staffNotifications.destination })
      .from(staffNotifications)
      .where(
        and(
          eq(staffNotifications.notificationReference, reference),
          eq(staffNotifications.staffUserId, staff.id),
        ),
      )
      .limit(1)
  )[0];
  if (!row) throw new Error("Notification not found.");
  await markStaffNotificationRead(clerkUserId, reference);
  return row.destination.startsWith("/admin/") && !/[\\\r\n]/.test(row.destination) ? row.destination : "/admin";
}
export async function markAllStaffNotificationsRead(clerkUserId: string) {
  const staff = await currentStaff(clerkUserId);
  return getDb()
    .update(staffNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(staffNotifications.staffUserId, staff.id),
        isNull(staffNotifications.readAt),
      ),
    )
    .returning({ id: staffNotifications.id });
}
export async function updateOwnStaffPreference(
  clerkUserId: string,
  category: string,
  emailEnabled: boolean,
  inAppEnabled: boolean,
) {
  const staff = await currentStaff(clerkUserId);
  if (
    !/^(CLIENTS|ASSESSMENTS|CLAIMS|MESSAGES|EVIDENCE|ASSIGNMENTS|PRIORITY)$/.test(
      category,
    )
  )
    throw new Error("Invalid notification category.");
  return getDb()
    .insert(staffNotificationPreferences)
    .values({
      staffUserId: staff.id,
      category,
      emailEnabled,
      inAppEnabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        staffNotificationPreferences.staffUserId,
        staffNotificationPreferences.category,
      ],
      set: { emailEnabled, inAppEnabled, updatedAt: new Date() },
    });
}
export async function retryEmailForStaff(
  clerkUserId: string,
  emailReference: string,
) {
  await requirePermission(clerkUserId, "SETTINGS_MANAGE");
  const staff = await currentStaff(clerkUserId);
  if (!isSafeEmailReference(emailReference))
    throw new Error("Invalid communication reference.");
  const db = getDb();
  return db.transaction(async (tx) => {
    const row = (
      await tx
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.emailReference, emailReference))
        .limit(1)
        .for("update")
    )[0];
    if (!row) throw new Error("This email is not eligible for retry.");

    const suppression = row.recipientEmail
      ? (
          await tx
            .select({ id: emailSuppressions.id })
            .from(emailSuppressions)
            .where(
              and(
                eq(emailSuppressions.normalizedEmail, row.recipientEmail),
                isNull(emailSuppressions.clearedAt),
              ),
            )
            .limit(1)
        )[0]
      : undefined;
    const blockingEvent = (
      await tx
        .select({ eventType: emailDeliveryEvents.eventType })
        .from(emailDeliveryEvents)
        .where(
          and(
            eq(emailDeliveryEvents.emailOutboxId, row.id),
            inArray(emailDeliveryEvents.eventType, [
              "email.delivered",
              "email.bounced",
              "email.complained",
              "email.suppressed",
            ]),
          ),
        )
        .limit(1)
    )[0];
    if (
      !canManuallyRetry(row, {
        suppressed: Boolean(suppression),
        blockingDeliveryEvent: blockingEvent?.eventType,
      })
    )
      throw new Error("This email is not eligible for retry.");

    const updated = await tx
      .update(emailOutbox)
      .set({
        status: "PENDING",
        availableAt: new Date(),
        processingStartedAt: null,
        failedAt: null,
        lastErrorCode: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(emailOutbox.id, row.id), eq(emailOutbox.status, row.status)),
      )
      .returning({ emailReference: emailOutbox.emailReference });
    if (!updated[0]) throw new Error("This email retry was already requested.");
    await recordStaffAuditEvent(tx, {
      actorStaffUserId: staff.id,
      actorType: "STAFF",
      action: "COMMUNICATION_RETRY_REQUESTED",
      targetType: "COMMUNICATION",
      targetReference: row.emailReference,
      metadata: {
        emailReference: row.emailReference,
        communicationEvent: row.eventKey,
      },
    });
    return updated[0];
  });
}
export async function getAssessmentReceiptStatus(reference: string) {
  const db = getDb();
  const row = (
    await db
      .select({
        emailReference: emailOutbox.emailReference,
        status: emailOutbox.status,
        attemptCount: emailOutbox.attemptCount,
        createdAt: emailOutbox.createdAt,
        lastAttemptAt: emailOutbox.lastAttemptAt,
        sentAt: emailOutbox.sentAt,
        lastErrorCode: emailOutbox.lastErrorCode,
        providerMessageId: emailOutbox.providerMessageId,
        providerFirstAttemptAt: emailOutbox.providerFirstAttemptAt,
        snapshotAddress: emailOutbox.recipientEmail,
      })
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.eventKey, "ASSESSMENT_RECEIVED"),
          eq(emailOutbox.dedupeKey, `ASSESSMENT_RECEIPT:${reference}`),
        ),
      )
      .limit(1)
  )[0];
  if (!row) return null;
  const [delivery, delivered] = await Promise.all([
    db
      .select({
        eventType: emailDeliveryEvents.eventType,
        occurredAt: emailDeliveryEvents.occurredAt,
      })
      .from(emailDeliveryEvents)
      .innerJoin(
        emailOutbox,
        eq(emailDeliveryEvents.emailOutboxId, emailOutbox.id),
      )
      .where(eq(emailOutbox.emailReference, row.emailReference))
      .orderBy(
        sql`case ${emailDeliveryEvents.eventType} when 'email.complained' then 4 when 'email.suppressed' then 4 when 'email.bounced' then 3 when 'email.delivered' then 2 else 1 end desc`,
        desc(emailDeliveryEvents.occurredAt),
        desc(emailDeliveryEvents.id),
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ occurredAt: emailDeliveryEvents.occurredAt })
      .from(emailDeliveryEvents)
      .innerJoin(
        emailOutbox,
        eq(emailDeliveryEvents.emailOutboxId, emailOutbox.id),
      )
      .where(
        and(
          eq(emailOutbox.emailReference, row.emailReference),
          eq(emailDeliveryEvents.eventType, "email.delivered"),
        ),
      )
      .orderBy(desc(emailDeliveryEvents.occurredAt))
      .limit(1)
      .then((rows) => rows[0]),
  ]);
  const suppression = row.snapshotAddress
    ? (
        await db
          .select({ id: emailSuppressions.id })
          .from(emailSuppressions)
          .where(
            and(
              eq(emailSuppressions.normalizedEmail, row.snapshotAddress),
              isNull(emailSuppressions.clearedAt),
            ),
          )
          .limit(1)
      )[0]
    : undefined;
  return {
    emailReference: row.emailReference,
    status: row.status,
    attemptCount: row.attemptCount,
    createdAt: row.createdAt,
    lastAttemptAt: row.lastAttemptAt,
    sentAt: row.sentAt,
    lastErrorCode: row.lastErrorCode,
    deliveryEvent: delivery?.eventType ?? null,
    deliveryAt: delivered?.occurredAt ?? null,
    retryEligible: canManuallyRetry(row, {
      suppressed: Boolean(suppression),
      blockingDeliveryEvent: delivery?.eventType,
    }),
  };
}
export async function getEmailMetrics() {
  try {
    const db = getDb();
    const [rows, delivery, suppressions] = await Promise.all([
      db
        .select({ status: emailOutbox.status, count: count() })
        .from(emailOutbox)
        .groupBy(emailOutbox.status),
      db
        .select({
          eventType: emailDeliveryEvents.eventType,
          count: countDistinct(emailDeliveryEvents.emailOutboxId),
        })
        .from(emailDeliveryEvents)
        .groupBy(emailDeliveryEvents.eventType),
      db
        .select({ count: count() })
        .from(emailSuppressions)
        .where(isNull(emailSuppressions.clearedAt)),
    ]);
    return {
      rows,
      delivery,
      suppressedAddresses: Number(suppressions[0]?.count ?? 0),
      operational: true,
    };
  } catch {
    return {
      rows: [],
      delivery: [],
      suppressedAddresses: 0,
      operational: false,
    };
  }
}
