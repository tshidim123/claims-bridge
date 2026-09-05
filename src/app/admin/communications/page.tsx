import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RetryCommunicationButton } from "@/components/admin/retry-communication-button";
import { getDb } from "@/lib/db";
import {
  emailDeliveryEvents,
  emailOutbox,
} from "@/lib/db/schema/communications";
import { getCurrentStaffContext } from "@/lib/staff/request";

const statuses = [
  "PENDING",
  "PROCESSING",
  "RETRY",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
const audiences = ["CLIENT", "STAFF", "PRE_ACCOUNT"] as const;
const pageSize = 25;

function valid<T extends readonly string[]>(
  value: string | undefined,
  values: T,
): T[number] | undefined {
  return value && values.includes(value) ? (value as T[number]) : undefined;
}

export const metadata = {
  title: "Communications",
  robots: { index: false, follow: false },
};

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    audience?: string;
    event?: string;
    page?: string;
  }>;
}) {
  const context = await getCurrentStaffContext();
  if (!context?.permissions.includes("SETTINGS_VIEW"))
    return <AdminAccessDenied forbidden />;
  const query = await searchParams;
  const status = valid(query.status, statuses);
  const audience = valid(query.audience, audiences);
  const event = query.event?.match(/^[A-Z_]{3,80}$/) ? query.event : undefined;
  const parsed = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const db = getDb();
  const [outboxMetrics, deliveryMetrics, rows] = await Promise.all([
    db
      .select({ status: emailOutbox.status, count: count() })
      .from(emailOutbox)
      .groupBy(emailOutbox.status),
    db
      .select({ status: emailDeliveryEvents.eventType, count: count() })
      .from(emailDeliveryEvents)
      .groupBy(emailDeliveryEvents.eventType),
    db
      .select({
        reference: emailOutbox.emailReference,
        event: emailOutbox.eventKey,
        audience: emailOutbox.recipientType,
        recipient: emailOutbox.recipientReference,
        template: emailOutbox.templateKey,
        status: emailOutbox.status,
        attempts: emailOutbox.attemptCount,
        createdAt: emailOutbox.createdAt,
        lastAttemptAt: emailOutbox.lastAttemptAt,
        sentAt: emailOutbox.sentAt,
        failure: emailOutbox.lastErrorCode,
      })
      .from(emailOutbox)
      .where(
        and(
          ...([
            status ? eq(emailOutbox.status, status) : undefined,
            audience ? eq(emailOutbox.recipientType, audience) : undefined,
            event ? eq(emailOutbox.eventKey, event) : undefined,
          ].filter(Boolean) as never[]),
        ),
      )
      .orderBy(desc(emailOutbox.createdAt), desc(emailOutbox.id))
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize),
  ]);
  const counts = new Map(
    outboxMetrics.map((item) => [item.status, Number(item.count)]),
  );
  const delivery = new Map(
    deliveryMetrics.map((item) => [item.status, Number(item.count)]),
  );
  const providerConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.CLAIMS_BRIDGE_FROM_EMAIL,
  );
  const retryAllowed = context.permissions.includes("SETTINGS_MANAGE");
  const items = rows.slice(0, pageSize);
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (audience) params.set("audience", audience);
  if (event) params.set("event", event);
  const href = (target: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `/admin/communications?${next}`;
  };
  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Operations / communications"
        title="Transactional communications"
        description={
          providerConfigured
            ? "Transactional delivery is configured. Provider delivery confirmation remains separate from sent state."
            : "Transactional email delivery is currently inactive because the provider is not configured."
        }
      />
      <section className="admin-status-grid">
        <h2>Outbox</h2>
        <dl>
          {statuses.map((item) => (
            <div key={item}>
              <dt>{item}</dt>
              <dd>{counts.get(item) ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="admin-status-grid">
        <h2>Delivery events</h2>
        <dl>
          {["delivered", "bounced", "complained", "suppressed"].map((item) => (
            <div key={item}>
              <dt>{item}</dt>
              <dd>{delivery.get(`email.${item}`) ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>
      <form
        className="admin-queue-filters"
        method="get"
        aria-label="Filter communications"
      >
        <label>
          Status
          <select name="status" defaultValue={status ?? ""}>
            <option value="">Any</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Audience
          <select name="audience" defaultValue={audience ?? ""}>
            <option value="">Any</option>
            {audiences.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Event
          <input
            name="event"
            defaultValue={event ?? ""}
            maxLength={80}
            placeholder="CLAIM_CREATED"
          />
        </label>
        <button className="button button--small button--primary">
          Apply filters
        </button>
      </form>
      <section>
        <h2>Recent communications</h2>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Event / audience</th>
                <th>Recipient reference</th>
                <th>Template</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Created</th>
                <th>Last attempt</th>
                <th>Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.reference}>
                  <td>
                    <Link
                      href={`/admin/communications/${encodeURIComponent(item.reference)}`}
                    >
                      {item.reference}
                    </Link>
                  </td>
                  <td>
                    {item.event}
                    <br />
                    <small>{item.audience}</small>
                  </td>
                  <td>{item.recipient ?? "—"}</td>
                  <td>{item.template}</td>
                  <td>
                    {item.status}
                    {item.failure ? (
                      <>
                        <br />
                        <small>Delivery failed</small>
                      </>
                    ) : null}
                  </td>
                  <td>{item.attempts}</td>
                  <td>{item.createdAt.toLocaleString("en-GB")}</td>
                  <td>{item.lastAttemptAt?.toLocaleString("en-GB") ?? "—"}</td>
                  <td>{item.sentAt?.toLocaleString("en-GB") ?? "—"}</td>
                  <td>
                    {retryAllowed &&
                    ["FAILED", "RETRY"].includes(item.status) ? (
                      <RetryCommunicationButton
                        emailReference={item.reference}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length ? <p>No communications match these filters.</p> : null}
      </section>
      <nav className="admin-case-navigation" aria-label="Communications pages">
        <div>
          {page > 1 ? <Link href={href(page - 1)}>Previous page</Link> : null}
          {rows.length > pageSize ? (
            <Link href={href(page + 1)}>Next page</Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
