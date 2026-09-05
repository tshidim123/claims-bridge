import { getCommunicationConfiguration } from "@/lib/communications/server-config";
import type { getEmailMetrics } from "@/lib/communications/staff-operations";

export function CommunicationsHealth({
  metrics,
}: {
  metrics: Awaited<ReturnType<typeof getEmailMetrics>>;
}) {
  const config = getCommunicationConfiguration();
  const outbox = new Map(
    metrics.rows.map((row) => [row.status, Number(row.count)]),
  );
  const configured = (value: boolean) =>
    value ? "Configured" : "Not configured";
  const queueCount = (status: string) =>
    metrics.operational ? (outbox.get(status) ?? 0) : "Unavailable";

  const deliverySummary = config.deliveryActive
    ? "Transactional provider configured. Sent means provider accepted; delivered requires provider confirmation."
    : "Transactional email delivery is inactive.";
  const queueSummary = !metrics.operational
    ? "Transactional queue is not operational."
    : Number(queueCount("FAILED")) > 0
      ? "Some transactional communications require attention."
      : "Transactional queue operational.";

  return (
    <section
      className="admin-status-grid"
      aria-labelledby="communications-health-title"
    >
      <h2 id="communications-health-title">Communications health</h2>
      <p>
        {deliverySummary} {queueSummary}
      </p>
      <dl>
        {[
          ["Transactional provider", configured(config.provider)],
          ["Sender identity", configured(config.sender)],
          ["Reply-to", configured(config.replyTo)],
          ["Webhook verification", configured(config.webhook)],
          [
            "External delivery",
            config.deliveryActive ? "Active" : "Inactive",
          ],
          [
            "Provider delivery tracking",
            config.deliveryTrackingActive ? "Available" : "Unavailable",
          ],
          [
            "Database queue",
            metrics.operational ? "Operational" : "Not operational",
          ],
          ["Pending", queueCount("PENDING")],
          ["Retry", queueCount("RETRY")],
          ["Failed", queueCount("FAILED")],
          [
            "Suppressed",
            metrics.operational
              ? metrics.suppressedAddresses
              : "Unavailable",
          ],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
