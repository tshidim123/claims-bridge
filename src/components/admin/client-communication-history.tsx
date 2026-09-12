import Link from "next/link";
import { getCurrentStaffContext } from "@/lib/staff/request";
import { getDb } from "@/lib/db";
import {
  emailOutbox,
  emailDeliveryEvents,
} from "@/lib/db/schema/communications";
import { and, desc, eq, sql } from "drizzle-orm";

export async function ClientCommunicationHistory({
  clientReference,
}: {
  clientReference: string;
}) {
  const context = await getCurrentStaffContext();
  if (!context?.permissions.includes("CLIENTS_VIEW")) return null;
  const rows = await getDb()
    .select({
      reference: emailOutbox.emailReference,
      event: emailOutbox.eventKey,
      status: emailOutbox.status,
      queued: emailOutbox.createdAt,
      sent: emailOutbox.sentAt,
      delivered: sql<
        string | null
      >`(select max(${emailDeliveryEvents.occurredAt}) from ${emailDeliveryEvents} where ${emailDeliveryEvents.emailOutboxId} = ${emailOutbox.id} and ${emailDeliveryEvents.eventType} = 'email.delivered')`,
    })
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.recipientType, "CLIENT"),
        eq(emailOutbox.recipientReference, clientReference),
      ),
    )
    .orderBy(desc(emailOutbox.createdAt))
    .limit(30);
  return (
    <section className="admin-section">
      <div className="admin-section__heading">
        <h2>Communication history</h2>
        {context.permissions.includes("SETTINGS_VIEW") && (
          <Link
            href={`/admin/communications?recipient=${encodeURIComponent(clientReference)}`}
          >
            Full delivery history
          </Link>
        )}
      </div>
      {rows.length ? (
        <ol className="admin-operations-list">
          {rows.map((row) => (
            <li className="admin-queue-item" key={row.reference}>
              <strong>
                {context.permissions.includes("SETTINGS_VIEW") ? (
                  <Link href={`/admin/communications/${row.reference}`}>
                    {row.reference}
                  </Link>
                ) : (
                  row.reference
                )}
              </strong>
              <p>
                {row.event.replaceAll("_", " ")} · {row.status}
              </p>
              <small>
                Queued {row.queued.toLocaleString("en-GB")}
                {row.sent && ` · Sent ${row.sent.toLocaleString("en-GB")}`}
                {row.delivered &&
                  ` · Delivered ${new Date(row.delivered).toLocaleString("en-GB")}`}
              </small>
            </li>
          ))}
        </ol>
      ) : (
        <p>No transactional communications recorded yet.</p>
      )}
    </section>
  );
}
