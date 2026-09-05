import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getDb } from "@/lib/db";
import {
  emailDeliveryEvents,
  emailOutbox,
  emailSuppressions,
} from "@/lib/db/schema/communications";
import { getCurrentStaffContext } from "@/lib/staff/request";
import {
  canManuallyRetry,
  deliveryLabel,
  failureLabel,
  isSafeEmailReference,
} from "@/lib/communications/policy";
import { RetryCommunicationButton } from "@/components/admin/retry-communication-button";

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ emailReference: string }>;
}) {
  const context = await getCurrentStaffContext();
  if (!context?.permissions.includes("SETTINGS_VIEW"))
    return <AdminAccessDenied forbidden />;
  const { emailReference } = await params;
  if (!isSafeEmailReference(emailReference)) notFound();
  const db = getDb();
  const item = (
    await db
      .select({
        id: emailOutbox.id,
        emailReference: emailOutbox.emailReference,
        eventKey: emailOutbox.eventKey,
        recipientType: emailOutbox.recipientType,
        recipientReference: emailOutbox.recipientReference,
        snapshotAddress: emailOutbox.recipientEmail,
        templateKey: emailOutbox.templateKey,
        templateVersion: emailOutbox.templateVersion,
        status: emailOutbox.status,
        attemptCount: emailOutbox.attemptCount,
        createdAt: emailOutbox.createdAt,
        lastAttemptAt: emailOutbox.lastAttemptAt,
        sentAt: emailOutbox.sentAt,
        providerMessageId: emailOutbox.providerMessageId,
        lastErrorCode: emailOutbox.lastErrorCode,
      })
      .from(emailOutbox)
      .where(eq(emailOutbox.emailReference, emailReference))
      .limit(1)
  )[0];
  if (!item) notFound();
  const [delivery, suppression] = await Promise.all([
    db
      .select({
        event: emailDeliveryEvents.eventType,
        occurredAt: emailDeliveryEvents.occurredAt,
      })
      .from(emailDeliveryEvents)
      .where(eq(emailDeliveryEvents.emailOutboxId, item.id))
      .orderBy(
        desc(emailDeliveryEvents.occurredAt),
        desc(emailDeliveryEvents.id),
      )
      .limit(10),
    item.snapshotAddress
      ? db
          .select({ id: emailSuppressions.id })
          .from(emailSuppressions)
          .where(
            and(
              eq(emailSuppressions.normalizedEmail, item.snapshotAddress),
              isNull(emailSuppressions.clearedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  const blockingEvent = delivery.find((event) =>
    [
      "email.delivered",
      "email.bounced",
      "email.complained",
      "email.suppressed",
    ].includes(event.event),
  )?.event;
  const retryEligible = canManuallyRetry(item, {
    suppressed: Boolean(suppression[0]),
    blockingDeliveryEvent: blockingEvent,
  });
  const currentDelivery = suppression[0]
    ? "Suppressed"
    : deliveryLabel(delivery[0]?.event ?? null, item.status);
  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Operations / communications"
        title={item.emailReference}
        description="A safe operational record. Recipient addresses, payloads and provider response bodies are not displayed."
      />
      <section className="admin-case-context">
        <span>
          <small>Event</small>
          <strong>{item.eventKey}</strong>
        </span>
        <span>
          <small>Audience</small>
          <strong>{item.recipientType}</strong>
        </span>
        <span>
          <small>Recipient reference</small>
          <strong>{item.recipientReference ?? "—"}</strong>
        </span>
        <span>
          <small>Template</small>
          <strong>
            {item.templateKey} v{item.templateVersion}
          </strong>
        </span>
        <span>
          <small>Status</small>
          <strong>{item.status}</strong>
        </span>
        <span>
          <small>Delivery state</small>
          <strong>{currentDelivery}</strong>
        </span>
        <span>
          <small>Attempts</small>
          <strong>{item.attemptCount}</strong>
        </span>
        <span>
          <small>Created</small>
          <strong>{item.createdAt.toLocaleString("en-GB")}</strong>
        </span>
        <span>
          <small>Last attempt</small>
          <strong>{item.lastAttemptAt?.toLocaleString("en-GB") ?? "—"}</strong>
        </span>
        <span>
          <small>Sent</small>
          <strong>{item.sentAt?.toLocaleString("en-GB") ?? "—"}</strong>
        </span>
        <span>
          <small>Failure category</small>
          <strong>{failureLabel(item.lastErrorCode)}</strong>
        </span>
      </section>
      {context.permissions.includes("SETTINGS_MANAGE") && retryEligible ? (
        <RetryCommunicationButton emailReference={item.emailReference} />
      ) : null}
      <section className="admin-control-panel">
        <p className="eyebrow">Provider delivery events</p>
        <h2>Delivery tracking</h2>
        {delivery.length ? (
          <ol>
            {delivery.map((event, index) => (
              <li
                key={`${event.event}-${event.occurredAt.toISOString()}-${index}`}
              >
                {deliveryLabel(event.event)} ·{" "}
                {event.occurredAt.toLocaleString("en-GB")}
              </li>
            ))}
          </ol>
        ) : (
          <p>
            No provider delivery confirmation has been recorded. Sent and
            delivered are distinct states.
          </p>
        )}
      </section>
    </div>
  );
}
