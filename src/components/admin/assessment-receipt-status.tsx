import { getAssessmentReceiptStatus } from "@/lib/communications/staff-operations";

function label(status: string, delivery: string | null) {
  if (delivery?.includes("delivered")) return "Delivered";
  if (delivery?.includes("bounced")) return "Bounced";
  if (delivery?.includes("complained")) return "Complained";
  return (
    (
      {
        PENDING: "Queued",
        PROCESSING: "Processing",
        RETRY: "Retrying",
        SENT: "Sent",
        FAILED: "Failed",
        CANCELLED: "Cancelled",
      } as Record<string, string>
    )[status] ?? status
  );
}

export async function AssessmentReceiptStatus({
  assessmentReference,
}: {
  assessmentReference: string;
}) {
  const receipt = await getAssessmentReceiptStatus(assessmentReference);
  if (!receipt) return null;
  return (
    <section className="admin-control-panel">
      <p className="eyebrow">Assessment confirmation email</p>
      <h2>{label(receipt.status, receipt.deliveryEvent)}</h2>
      <dl className="admin-case-context">
        <span>
          <small>Email reference</small>
          <strong>{receipt.emailReference}</strong>
        </span>
        <span>
          <small>Attempts</small>
          <strong>{receipt.attemptCount}</strong>
        </span>
        <span>
          <small>Queued</small>
          <strong>{receipt.createdAt.toLocaleString("en-GB")}</strong>
        </span>
        <span>
          <small>Last attempt</small>
          <strong>
            {receipt.lastAttemptAt?.toLocaleString("en-GB") ?? "—"}
          </strong>
        </span>
        <span>
          <small>Sent</small>
          <strong>{receipt.sentAt?.toLocaleString("en-GB") ?? "—"}</strong>
        </span>
        <span>
          <small>Delivery confirmation</small>
          <strong>
            {receipt.deliveryAt?.toLocaleString("en-GB") ?? "Not confirmed"}
          </strong>
        </span>
      </dl>
      <p>
        Sent means the provider accepted the request. Delivered requires a
        separate provider delivery event.
      </p>
    </section>
  );
}
