import Link from "next/link";

import { RetryCommunicationButton } from "@/components/admin/retry-communication-button";
import { getAssessmentReceiptStatus } from "@/lib/communications/staff-operations";
import { receiptLabel } from "@/lib/communications/policy";
import { getCurrentStaffContext } from "@/lib/staff/request";

export async function AssessmentReceiptStatus({
  assessmentReference,
}: {
  assessmentReference: string;
}) {
  const [receipt, context] = await Promise.all([
    getAssessmentReceiptStatus(assessmentReference),
    getCurrentStaffContext(),
  ]);
  if (!receipt) return null;
  const canViewCommunications =
    context?.permissions.includes("SETTINGS_VIEW") ?? false;
  const canRetry =
    receipt.retryEligible &&
    (context?.permissions.includes("SETTINGS_MANAGE") ?? false);
  return (
    <section className="admin-control-panel">
      <p className="eyebrow">Assessment confirmation email</p>
      <h2>
        {receiptLabel(
          receipt.status,
          receipt.deliveryEvent,
          receipt.lastErrorCode,
        )}
      </h2>
      <dl className="admin-case-context">
        <div>
          <dt>Email reference</dt>
          <dd>
            {canViewCommunications ? (
              <Link href={`/admin/communications/${receipt.emailReference}`}>
                {receipt.emailReference}
              </Link>
            ) : (
              receipt.emailReference
            )}
          </dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd>{receipt.attemptCount}</dd>
        </div>
        <div>
          <dt>Queued</dt>
          <dd>{receipt.createdAt.toLocaleString("en-GB")}</dd>
        </div>
        <div>
          <dt>Last attempt</dt>
          <dd>
            {receipt.lastAttemptAt?.toLocaleString("en-GB") ?? "—"}
          </dd>
        </div>
        <div>
          <dt>Sent</dt>
          <dd>{receipt.sentAt?.toLocaleString("en-GB") ?? "—"}</dd>
        </div>
        <div>
          <dt>Delivery confirmation</dt>
          <dd>
            {receipt.deliveryAt?.toLocaleString("en-GB") ?? "Not confirmed"}
          </dd>
        </div>
      </dl>
      <p>
        Sent means the provider accepted the request. Delivered requires a
        separate provider delivery event.
      </p>
      {canRetry ? (
        <RetryCommunicationButton emailReference={receipt.emailReference} />
      ) : null}
    </section>
  );
}
