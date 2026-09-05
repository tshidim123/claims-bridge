import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getDb } from "@/lib/db";
import {
  emailDeliveryEvents,
  emailOutbox,
} from "@/lib/db/schema/communications";
import { getCurrentStaffContext } from "@/lib/staff/request";

function failureLabel(code: string | null) {
  if (!code) return "None recorded";
  if (code.includes("SUPPRESSED")) return "Recipient suppressed";
  if (code.includes("VERIFIED")) return "No verified email";
  if (code.includes("UNAVAILABLE")) return "Recipient unavailable";
  if (code.includes("PROVIDER")) return "Provider unavailable";
  return "Delivery failed";
}

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ emailReference: string }>;
}) {
  const context = await getCurrentStaffContext();
  if (!context?.permissions.includes("SETTINGS_VIEW"))
    return <AdminAccessDenied forbidden />;
  const { emailReference } = await params;
  if (!/^CB-EML-[A-Z0-9-]+$/.test(emailReference)) notFound();
  const db = getDb();
  const item = (
    await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.emailReference, emailReference))
      .limit(1)
  )[0];
  if (!item) notFound();
  const delivery = await db
    .select({
      event: emailDeliveryEvents.eventType,
      occurredAt: emailDeliveryEvents.occurredAt,
    })
    .from(emailDeliveryEvents)
    .where(eq(emailDeliveryEvents.emailOutboxId, item.id))
    .orderBy(desc(emailDeliveryEvents.occurredAt))
    .limit(10);
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
      <section className="admin-control-panel">
        <p className="eyebrow">Provider delivery events</p>
        <h2>Delivery tracking</h2>
        {delivery.length ? (
          <ol>
            {delivery.map((event, index) => (
              <li
                key={`${event.event}-${event.occurredAt.toISOString()}-${index}`}
              >
                {event.event} · {event.occurredAt.toLocaleString("en-GB")}
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
