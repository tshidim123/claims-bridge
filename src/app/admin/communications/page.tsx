import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RetryCommunicationButton } from "@/components/admin/retry-communication-button";
import { getDb } from "@/lib/db";
import {
  emailDeliveryEvents,
  emailOutbox,
  emailSuppressions,
} from "@/lib/db/schema/communications";
import { getCurrentStaffContext } from "@/lib/staff/request";

import {
  canManuallyRetry,
  communicationAudiences as audiences,
  deliveryFilters,
  deliveryLabel,
  failureLabel,
  outboxStatuses as statuses,
} from "@/lib/communications/policy";
import { communicationEvents } from "@/lib/communications/registry";
import { getEmailMetrics } from "@/lib/communications/staff-operations";
import { CommunicationsHealth } from "@/components/admin/communications-health";
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
    delivery?: string;
    page?: string;
  }>;
}) {
  const context = await getCurrentStaffContext();
  if (!context?.permissions.includes("SETTINGS_VIEW"))
    return <AdminAccessDenied forbidden />;
  const query = await searchParams;
  const status = valid(query.status, statuses);
  const audience = valid(query.audience, audiences);
  const event =
    query.event && Object.hasOwn(communicationEvents, query.event)
      ? query.event
      : undefined;
  const deliveryState = valid(query.delivery, deliveryFilters);
  const parsed = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 1;
  const db = getDb();
  const latestDeliveryEvent = sql<string | null>`(
    select ${emailDeliveryEvents.eventType}
    from ${emailDeliveryEvents}
    where ${emailDeliveryEvents.emailOutboxId} = ${emailOutbox.id}
    order by ${emailDeliveryEvents.occurredAt} desc, ${emailDeliveryEvents.id} desc
    limit 1
  )`;
  const activeSuppression = sql<boolean>`exists (
    select 1 from ${emailSuppressions}
    where ${emailSuppressions.normalizedEmail} = ${emailOutbox.recipientEmail}
      and ${emailSuppressions.clearedAt} is null
  )`;
  const deliveryCondition =
    deliveryState === "UNCONFIRMED"
      ? sql`not exists (
          select 1 from ${emailDeliveryEvents}
          where ${emailDeliveryEvents.emailOutboxId} = ${emailOutbox.id}
        ) and not ${activeSuppression}`
      : deliveryState === "SUPPRESSED"
        ? sql`(${latestDeliveryEvent} = 'email.suppressed' or ${activeSuppression})`
        : deliveryState
          ? sql`${latestDeliveryEvent} = ${`email.${deliveryState.toLowerCase()}`}`
          : undefined;
  const [metrics, rows] = await Promise.all([
    getEmailMetrics(),
    db
      .select({
        reference: emailOutbox.emailReference,
        event: emailOutbox.eventKey,
        audience: emailOutbox.recipientType,
        recipient: emailOutbox.recipientReference,
        template: emailOutbox.templateKey,
        status: emailOutbox.status,
        attemptCount: emailOutbox.attemptCount,
        createdAt: emailOutbox.createdAt,
        lastAttemptAt: emailOutbox.lastAttemptAt,
        sentAt: emailOutbox.sentAt,
        lastErrorCode: emailOutbox.lastErrorCode,
        providerMessageId: emailOutbox.providerMessageId,
        deliveryEvent: latestDeliveryEvent,
        suppressed: activeSuppression,
      })
      .from(emailOutbox)
      .where(
        and(
          status ? eq(emailOutbox.status, status) : undefined,
          audience ? eq(emailOutbox.recipientType, audience) : undefined,
          event ? eq(emailOutbox.eventKey, event) : undefined,
          deliveryCondition,
        ),
      )
      .orderBy(desc(emailOutbox.createdAt), desc(emailOutbox.id))
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize),
  ]);
  const counts = new Map(
    metrics.rows.map((item) => [item.status, Number(item.count)]),
  );
  const delivery = new Map(
    metrics.delivery.map((item) => [item.eventType, Number(item.count)]),
  );
  const retryAllowed = context.permissions.includes("SETTINGS_MANAGE");
  const items = rows.slice(0, pageSize);
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (audience) params.set("audience", audience);
  if (event) params.set("event", event);
  if (deliveryState) params.set("delivery", deliveryState);
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
        description="Inspect the durable queue and confirmed provider delivery state."
      />
      <CommunicationsHealth metrics={metrics} />
      <section className="admin-status-grid">
        <h2>Outbox</h2>
        <dl>
          {statuses.map((item) => (
            <div key={item}>
              <dt>{item}</dt>
              <dd>
                {metrics.operational ? (counts.get(item) ?? 0) : "Unavailable"}
              </dd>
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
              <dd>
                {item === "suppressed"
                  ? metrics.operational
                    ? metrics.suppressedAddresses
                    : "Unavailable"
                  : metrics.operational
                    ? (delivery.get(`email.${item}`) ?? 0)
                    : "Unavailable"}
              </dd>
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
          <select name="event" defaultValue={event ?? ""}>
            <option value="">Any</option>
            {Object.keys(communicationEvents).map((key) => (
              <option key={key}>{key}</option>
            ))}
          </select>
        </label>
        <label>
          Delivery state
          <select name="delivery" defaultValue={deliveryState ?? ""}>
            <option value="">Any</option>
            {deliveryFilters.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
        <button className="button button--small button--primary" type="submit">
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
                <th>Delivery</th>
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
                    {item.lastErrorCode ? (
                      <>
                        <br />
                        <small>{failureLabel(item.lastErrorCode)}</small>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {item.suppressed
                      ? "Suppressed"
                      : deliveryLabel(item.deliveryEvent, item.status)}
                  </td>
                  <td>{item.attemptCount}</td>
                  <td>{item.createdAt.toLocaleString("en-GB")}</td>
                  <td>{item.lastAttemptAt?.toLocaleString("en-GB") ?? "—"}</td>
                  <td>{item.sentAt?.toLocaleString("en-GB") ?? "—"}</td>
                  <td>
                    {retryAllowed &&
                    canManuallyRetry(item, {
                      suppressed: item.suppressed,
                      blockingDeliveryEvent: item.deliveryEvent,
                    }) ? (
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
