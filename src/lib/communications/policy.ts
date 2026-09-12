export const outboxStatuses = [
  "PENDING",
  "PROCESSING",
  "RETRY",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;

export const communicationAudiences = ["CLIENT", "STAFF", "PRE_ACCOUNT"] as const;

export const deliveryFilters = [
  "UNCONFIRMED",
  "DELIVERED",
  "BOUNCED",
  "COMPLAINED",
  "SUPPRESSED",
] as const;

export const maxDeliveryAttempts = 5;
export const providerIdempotencyWindowMs = 23 * 60 * 60_000;

const retryableFailureCodes = new Set([
  "PROVIDER_NOT_CONFIGURED",
  "NO_VERIFIED_EMAIL",
  "CLIENT_IDENTITY_NOT_FOUND",
  "STAFF_IDENTITY_NOT_FOUND",
  "CLERK_USER_NOT_FOUND",
  "IDENTITY_PROVIDER_TEMPORARY_FAILURE",
  "PROVIDER_TEMPORARY_FAILURE",
  "INVALID_PROVIDER_RESPONSE",
  "PROCESSING_TEMPORARY_FAILURE",
  "PROCESSING_LEASE_LOST",
]);

const failureLabels: Readonly<Record<string, string>> = {
  RECIPIENT_UNAVAILABLE: "Recipient unavailable",
  CLIENT_IDENTITY_NOT_FOUND: "Recipient unavailable",
  STAFF_IDENTITY_NOT_FOUND: "Recipient unavailable",
  CLERK_USER_NOT_FOUND: "Identity provider account unavailable",
  NO_VERIFIED_EMAIL: "No verified email",
  RECIPIENT_INVALID: "Recipient unavailable",
  RECIPIENT_SUPPRESSED: "Recipient suppressed",
  PROVIDER_NOT_CONFIGURED: "Provider unavailable",
  PROVIDER_FAILED: "Delivery failed",
  RETRY_LIMIT_REACHED: "Retry limit reached",
  IDENTITY_PROVIDER_TEMPORARY_FAILURE: "Identity provider temporarily unavailable",
  PROVIDER_TEMPORARY_FAILURE: "Provider temporarily unavailable",
  INVALID_PROVIDER_RESPONSE: "Provider response unavailable",
  PROCESSING_TEMPORARY_FAILURE: "Queue temporarily unavailable",
  PROCESSING_LEASE_LOST: "Processing interrupted",
  DELIVERY_UNCERTAIN: "Delivery uncertain — provider reconciliation required",
  INVALID_EMAIL_REQUEST: "Communication requires technical review",
  DEVELOPMENT_RECIPIENT_BLOCKED: "Development recipient not allowlisted",
  "email.bounced": "Recipient hard bounced",
  "email.complained": "Recipient complained",
  "email.suppressed": "Recipient suppressed",
};

export function isSafeEmailReference(value: string) {
  return /^CB-EML-[A-F0-9]{8}$/.test(value);
}

export function failureLabel(code: string | null) {
  if (!code) return "None recorded";
  if (/^RESEND_5\d\d$/.test(code)) return "Provider unavailable";
  if (/^RESEND_4\d\d$/.test(code)) return "Provider rejected request";
  return failureLabels[code] ?? "Delivery failed";
}

export function canManuallyRetry(
  record: {
    status: string;
    attemptCount: string;
    lastErrorCode: string | null;
    providerMessageId?: string | null;
    sentAt?: Date | null;
    providerFirstAttemptAt?: Date | null;
  },
  options: {
    suppressed?: boolean;
    blockingDeliveryEvent?: string | null;
  } = {},
) {
  const providerConfirmed = new Set([
    "email.delivered",
    "email.bounced",
    "email.complained",
    "email.suppressed",
  ]).has(options.blockingDeliveryEvent ?? "");
  const errorCode = record.lastErrorCode ?? "";
  const attempts = Number(record.attemptCount);
  const retryableProviderFailure = /^RESEND_(408|409|429|5\d\d)$/.test(errorCode);

  return (
    !options.suppressed &&
    !providerConfirmed &&
    !record.providerMessageId &&
    !record.sentAt &&
    (!record.providerFirstAttemptAt || Date.now() - record.providerFirstAttemptAt.getTime() < providerIdempotencyWindowMs) &&
    (record.status === "FAILED" || record.status === "RETRY") &&
    Number.isInteger(attempts) &&
    attempts >= 0 &&
    attempts < maxDeliveryAttempts &&
    (retryableFailureCodes.has(errorCode) || retryableProviderFailure)
  );
}

export function receiptLabel(
  status: string,
  deliveryEvent: string | null,
  errorCode: string | null = null,
) {
  if (
    errorCode === "RECIPIENT_SUPPRESSED" ||
    errorCode === "email.complained" ||
    errorCode === "email.suppressed" ||
    deliveryEvent === "email.suppressed" ||
    deliveryEvent === "email.complained"
  )
    return "Suppressed";
  if (deliveryEvent === "email.bounced" || errorCode === "email.bounced") return "Bounced";
  if (deliveryEvent === "email.delivered") return "Delivered";
  return (
    {
      PENDING: "Queued",
      PROCESSING: "Processing",
      RETRY: "Retrying",
      SENT: "Sent",
      FAILED: "Failed",
      CANCELLED: "Cancelled",
    } as Readonly<Record<string, string>>
  )[status] ?? "Unavailable";
}

export function deliveryLabel(event: string | null, outboxStatus?: string) {
  if (event === "email.delivered") return "Delivered";
  if (event === "email.bounced") return "Bounced";
  if (event === "email.complained") return "Complained";
  if (event === "email.suppressed") return "Suppressed";
  if (event === "email.failed") return "Failed";
  return outboxStatus === "SENT" ? "Awaiting confirmation" : "Not confirmed";
}
